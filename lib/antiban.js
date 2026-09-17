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
// In-memory state cache
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
export async function getAntibanState(phoneNumber) {
  const entry = await getEntry(phoneNumber);
  return entry.state;
}
export function getWarmupDailyLimit(warmupDay, mode = 'MODERATE') {
  if (warmupDay >= WARMUP_DAYS) return LIMITS[mode].msgsPerDay;
  const progress = warmupDay / WARMUP_DAYS;
  const base = WARMUP_START_DAILY + (LIMITS[mode].msgsPerDay - WARMUP_START_DAILY) * progress;
  return Math.floor(base);
}
export function gaussianJitter(minMs = 800, maxMs = 2500) {
  const mean = (minMs + maxMs) / 2;
  const stdDev = (maxMs - minMs) / 4;
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const result = mean + z * stdDev;
  return Math.max(minMs, Math.min(maxMs, Math.round(result)));
}
export function jitterRangeForWarmup(warmupDay = 0) {
  if (warmupDay >= 14) return [250, 700];
  if (warmupDay >= 7)  return [400, 1100];
  if (warmupDay >= 3)  return [700, 1800];
  return [1000, 2800];
}
export async function adaptiveDelay(phoneNumber) {
  const state = await getAntibanState(phoneNumber);
  const [min, max] = jitterRangeForWarmup(state.warmup_day || 0);
  return gaussianJitter(min, max);
}
export async function canSend(phoneNumber, mode = 'MODERATE') {
  const entry = await getEntry(phoneNumber);
  const state = entry.state;
  const limits = LIMITS[mode];
  const now = Date.now();
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
      ).catch(err => {
        console.error(`⚠️ antiban flush failed for ${phoneNumber}:`, err.message);
      })
    );
  }
  if (writes.length) await Promise.all(writes);
}
// Periodic flush
setInterval(() => { flushAntibanState().catch(() => {}); }, FLUSH_INTERVAL_MS).unref();
// Safe shutdown helper
export async function shutdownAntiban() {
  try {
    await flushAntibanState();
    console.log('✅ Antiban state flushed on shutdown');
  } catch (err) {
    console.error('❌ Antiban shutdown error:', err.message);
  }
}
// Manual reset helper (admin use)
export async function resetAntibanState(phoneNumber) {
  const entry = memCache.get(phoneNumber);
  if (entry) {
    entry.state.daily_count = 0;
    entry.state.hourly_count = 0;
    entry.state.minute_count = 0;
    entry.state.warmup_day = 0;
    entry.state.last_reset_day = new Date().toISOString().slice(0, 10);
    entry.dirty = true;
  }
  await pool.query(
    `UPDATE antiban_state
     SET daily_count = 0, hourly_count = 0, minute_count = 0,
         warmup_day = 0, last_reset_day = $1
     WHERE phone_number = $2`,
    [new Date().toISOString().slice(0, 10), phoneNumber]
  );
}
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
