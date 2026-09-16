/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
 */

import { pool } from './database.js';

// ============================================
// ANTIBAN — Human-like messaging protection
// ============================================

const LIMITS = {
  CONSERVATIVE: { msgsPerMin: 2, msgsPerHour: 40, msgsPerDay: 200 },
  MODERATE:     { msgsPerMin: 5, msgsPerHour: 100, msgsPerDay: 600 },
  AGGRESSIVE:   { msgsPerMin: 10, msgsPerHour: 200, msgsPerDay: 1500 },
};

const WARMUP_DAYS = 7;
const WARMUP_START_DAILY = 20;
const WARMUP_END_DAILY = 1000;
const FLUSH_INTERVAL_MS = 15000;

// ------------------------------------------------------------------
// In-memory state cache.
// The old version hit Postgres 3–5 times per outbound message
// (getAntibanState in canSend, again in adaptiveDelay, then an
// UPDATE in recordSend, plus reset UPDATEs). That's blocking DB
// latency stacked on top of the deliberate anti-ban jitter delay,
// on a queue that's already serialized per number.
//
// Now: the first send for a number loads its row from Postgres and
// caches it. Every read/write after that touches only memory. Dirty
// entries are flushed to Postgres on an interval (and on shutdown
// via flushAntibanState()), so a crash loses at most ~15s of
// counters — the fields that actually matter for warm-up integrity
// (last_reset_day, warmup_day) are written on every flush.
// ------------------------------------------------------------------
const memCache = new Map(); // phoneNumber -> { state, dirty }

async function loadFromDB(phoneNumber) {
  const { rows } = await pool.query(
    'SELECT * FROM antiban_state WHERE phone_number = $1',
    [phoneNumber]
  );

  if (rows[0]) return rows[0];

  await pool.query(
    `INSERT INTO antiban_state (phone_number, first_seen, warmup_day, daily_count, hourly_count, minute_count)
     VALUES ($1, NOW(), 0, 0, 0, 0)
     ON CONFLICT DO NOTHING`,
    [phoneNumber]
  );

  const fresh = await pool.query(
    'SELECT * FROM antiban_state WHERE phone_number = $1',
    [phoneNumber]
  );
  return fresh.rows[0];
}

async function getEntry(phoneNumber) {
  let entry = memCache.get(phoneNumber);
  if (!entry) {
    const state = await loadFromDB(phoneNumber);
    entry = { state, dirty: false };
    memCache.set(phoneNumber, entry);
  }
  return entry;
}

/**
 * Get or create antiban state for a phone number.
 * First call per number touches Postgres; every call after that is
 * served from the in-memory cache.
 */
export async function getAntibanState(phoneNumber) {
  const entry = await getEntry(phoneNumber);
  return entry.state;
}

/**
 * Compute the current daily limit based on warm-up day.
 * Day 0 (new): 20 msgs. Day 7+: full limit.
 */
export function getWarmupDailyLimit(warmupDay, mode = 'MODERATE') {
  if (warmupDay >= WARMUP_DAYS) return LIMITS[mode].msgsPerDay;
  const progress = warmupDay / WARMUP_DAYS;
  const base = WARMUP_START_DAILY + (LIMITS[mode].msgsPerDay - WARMUP_START_DAILY) * progress;
  return Math.floor(base);
}

/**
 * Gaussian jitter — random delay that looks human.
 * Uses Box-Muller transform for a normal distribution.
 */
export function gaussianJitter(minMs = 800, maxMs = 2500) {
  const mean = (minMs + maxMs) / 2;
  const stdDev = (maxMs - minMs) / 4;
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const result = mean + z * stdDev;
  return Math.max(minMs, Math.min(maxMs, Math.round(result)));
}

/**
 * Adaptive jitter preset based on warm-up day.
 * Trusted sessions send faster, new sessions slower.
 */
export function jitterRangeForWarmup(warmupDay = 0) {
  if (warmupDay >= 14) return [250, 700];    // Trusted — very fast
  if (warmupDay >= 7)  return [400, 1100];   // Established — fast
  if (warmupDay >= 3)  return [700, 1800];   // Mid warm-up — moderate
  return [1000, 2800];                        // New — slow + safe
}

/**
 * Compute adaptive jitter delay for a given session.
 * Reads warm-up state from the in-memory cache and returns a delay in ms.
 */
export async function adaptiveDelay(phoneNumber) {
  const state = await getAntibanState(phoneNumber);
  const [min, max] = jitterRangeForWarmup(state.warmup_day || 0);
  return gaussianJitter(min, max);
}

/**
 * Check if a session can send right now.
 * Mutates the cached state in place; no DB write on the hot path.
 */
export async function canSend(phoneNumber, mode = 'MODERATE') {
  const entry = await getEntry(phoneNumber);
  const state = entry.state;
  const limits = LIMITS[mode];
  const now = Date.now();

  // 1. Daily limit + warm-up day advancement
  const today = new Date().toISOString().slice(0, 10);
  if (state.last_reset_day !== today) {
    state.daily_count = 0;
    state.last_reset_day = today;
    state.warmup_day = Math.min((state.warmup_day || 0) + 1, WARMUP_DAYS);
    entry.dirty = true;
  }

  const dailyLimit = getWarmupDailyLimit(state.warmup_day, mode);
  if (state.daily_count >= dailyLimit) {
    return {
      allowed: false,
      reason: `Daily warm-up limit reached (${state.daily_count}/${dailyLimit}). Resumes tomorrow.`,
    };
  }

  // 2. Hourly limit
  const hourAgo = now - 3600000;
  if (state.last_hour_reset && new Date(state.last_hour_reset).getTime() > hourAgo) {
    if (state.hourly_count >= limits.msgsPerHour) {
      return {
        allowed: false,
        reason: `Hourly limit reached (${limits.msgsPerHour}). Try again later.`,
        waitMs: 60000,
      };
    }
  } else {
    state.hourly_count = 0;
    state.last_hour_reset = new Date();
    entry.dirty = true;
  }

  // 3. Per-minute limit
  const minuteAgo = now - 60000;
  if (state.last_minute_reset && new Date(state.last_minute_reset).getTime() > minuteAgo) {
    if (state.minute_count >= limits.msgsPerMin) {
      const waitMs = 60000 - (now - new Date(state.last_minute_reset).getTime());
      return {
        allowed: false,
        reason: `Rate limited. Wait ${Math.ceil(waitMs / 1000)}s.`,
        waitMs: Math.max(1000, waitMs),
      };
    }
  } else {
    state.minute_count = 0;
    state.last_minute_reset = new Date();
    entry.dirty = true;
  }

  return { allowed: true };
}

/**
 * Record a sent message (increment counters). In-memory only —
 * picked up by the next periodic flush.
 */
export async function recordSend(phoneNumber) {
  const entry = await getEntry(phoneNumber);
  const state = entry.state;
  state.daily_count = (state.daily_count || 0) + 1;
  state.hourly_count = (state.hourly_count || 0) + 1;
  state.minute_count = (state.minute_count || 0) + 1;
  state.total_sent = (state.total_sent || 0) + 1;
  state.last_sent = new Date();
  entry.dirty = true;
}

/**
 * Persist every dirty cache entry to Postgres in one pass.
 * Runs on an interval and should also be called on shutdown.
 */
export async function flushAntibanState() {
  const writes = [];
  for (const [phoneNumber, entry] of memCache.entries()) {
    if (!entry.dirty) continue;
    entry.dirty = false;
    const s = entry.state;
    writes.push(
      pool.query(
        `UPDATE antiban_state
         SET daily_count = $1, hourly_count = $2, minute_count = $3,
             total_sent = $4, last_sent = $5, last_reset_day = $6,
             last_hour_reset = $7, last_minute_reset = $8, warmup_day = $9
         WHERE phone_number = $10`,
        [s.daily_count, s.hourly_count, s.minute_count, s.total_sent,
         s.last_sent, s.last_reset_day, s.last_hour_reset, s.last_minute_reset,
         s.warmup_day, phoneNumber]
      ).catch(err => console.error(`⚠️ antiban flush failed for ${phoneNumber}:`, err.message))
    );
  }
  if (writes.length) await Promise.all(writes);
}

setInterval(() => { flushAntibanState().catch(() => {}); }, FLUSH_INTERVAL_MS).unref();

/**
 * Health check — returns risk score for a session.
 * Flushes this number's pending counters first so the score reflects
 * the latest state (error_count/disconnect_count are written directly
 * to Postgres elsewhere, so this always reads fresh from the DB).
 */
export async function getHealth(phoneNumber) {
  const entry = memCache.get(phoneNumber);
  if (entry?.dirty) {
    await flushAntibanState();
  }

  const { rows } = await pool.query(
    'SELECT * FROM antiban_state WHERE phone_number = $1',
    [phoneNumber]
  );
  const state = rows[0] || await loadFromDB(phoneNumber);
  const dailyLimit = getWarmupDailyLimit(state.warmup_day);

  let risk = 0;
  if (state.warmup_day < 3) risk += 30;
  if (state.daily_count > dailyLimit * 0.8) risk += 20;
  if ((state.error_count || 0) > 5) risk += 30;
  if (state.disconnect_count > 3) risk += 20;

  let level = 'low';
  if (risk >= 60) level = 'high';
  else if (risk >= 30) level = 'medium';

  return {
    phoneNumber,
    warmupDay: state.warmup_day,
    warmupProgress: `${Math.min(state.warmup_day, WARMUP_DAYS)}/${WARMUP_DAYS} days`,
    dailyLimit,
    dailyUsed: state.daily_count,
    totalSent: state.total_sent || 0,
    riskScore: risk,
    riskLevel: level,
  };
}
