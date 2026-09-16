/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
 */

import { pool } from './database.js';
import crypto from 'crypto';

// ============================================
// ANTIBAN — Human-like messaging protection
// ============================================

// Rate limits (per session, per day)
const LIMITS = {
  CONSERVATIVE: { msgsPerMin: 2, msgsPerHour: 40, msgsPerDay: 200 },
  MODERATE:     { msgsPerMin: 5, msgsPerHour: 100, msgsPerDay: 600 },
  AGGRESSIVE:   { msgsPerMin: 10, msgsPerHour: 200, msgsPerDay: 1500 },
};

// Warm-up schedule — new numbers ramp up over 7 days
const WARMUP_DAYS = 7;
const WARMUP_START_DAILY = 20;   // Day 1 max
const WARMUP_END_DAILY = 1000;   // Day 7+ max

/**
 * Get or create antiban state for a phone number.
 * Stored in Postgres so restarts don't reset warm-up progress.
 */
export async function getAntibanState(phoneNumber) {
  const { rows } = await pool.query(
    'SELECT * FROM antiban_state WHERE phone_number = $1',
    [phoneNumber]
  );

  if (rows[0]) return rows[0];

  // First time we've seen this number
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

/**
 * Compute the current daily limit based on warm-up day.
 * Day 0 (new): 20 msgs. Day 7+: full limit.
 */
export function getWarmupDailyLimit(warmupDay, mode = 'MODERATE') {
  if (warmupDay >= WARMUP_DAYS) return LIMITS[mode].msgsPerDay;

  // Linear ramp from 20 → mode limit over 7 days
  const progress = warmupDay / WARMUP_DAYS;
  const base = WARMUP_START_DAILY + (LIMITS[mode].msgsPerDay - WARMUP_START_DAILY) * progress;
  return Math.floor(base);
}

/**
 * Gaussian jitter — random delay that looks human.
 * Humans don't send messages exactly 1.500s apart.
 * Returns milliseconds between min and max, weighted toward the middle.
 */
export function gaussianJitter(minMs = 800, maxMs = 2500) {
  const mean = (minMs + maxMs) / 2;
  const stdDev = (maxMs - minMs) / 4;
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const result = mean + z * stdDev;
  return Math.max(minMs, Math.min(maxMs, Math.round(result)));
}

/**
 * Check if a session can send right now.
 * Returns { allowed: boolean, reason?: string, waitMs?: number }
 */
export async function canSend(phoneNumber, mode = 'MODERATE') {
  const state = await getAntibanState(phoneNumber);
  const limits = LIMITS[mode];

  // 1. Check warm-up daily limit
  const today = new Date().toISOString().slice(0, 10);
  if (state.last_reset_day !== today) {
    // New day — reset counters and advance warm-up day
    await pool.query(
      `UPDATE antiban_state 
       SET daily_count = 0, last_reset_day = $1,
           warmup_day = LEAST(warmup_day + 1, $2)
       WHERE phone_number = $3`,
      [today, WARMUP_DAYS, phoneNumber]
    );
    state.daily_count = 0;
    state.warmup_day = Math.min((state.warmup_day || 0) + 1, WARMUP_DAYS);
  }

  const dailyLimit = getWarmupDailyLimit(state.warmup_day, mode);
  if (state.daily_count >= dailyLimit) {
    return {
      allowed: false,
      reason: `Daily warm-up limit reached (${state.daily_count}/${dailyLimit}). Resumes tomorrow.`,
    };
  }

  // 2. Check hourly limit
  const hourAgo = new Date(Date.now() - 3600000);
  if (state.last_hour_reset && new Date(state.last_hour_reset) > hourAgo) {
    if (state.hourly_count >= limits.msgsPerHour) {
      return {
        allowed: false,
        reason: `Hourly limit reached (${limits.msgsPerHour}). Try again later.`,
        waitMs: 60000,
      };
    }
  } else {
    // Reset hourly counter
    await pool.query(
      'UPDATE antiban_state SET hourly_count = 0, last_hour_reset = NOW() WHERE phone_number = $1',
      [phoneNumber]
    );
    state.hourly_count = 0;
  }

  // 3. Check per-minute limit
  const minuteAgo = new Date(Date.now() - 60000);
  if (state.last_minute_reset && new Date(state.last_minute_reset) > minuteAgo) {
    if (state.minute_count >= limits.msgsPerMin) {
      const waitMs = 60000 - (Date.now() - new Date(state.last_minute_reset).getTime());
      return {
        allowed: false,
        reason: `Rate limited. Wait ${Math.ceil(waitMs / 1000)}s.`,
        waitMs: Math.max(1000, waitMs),
      };
    }
  } else {
    await pool.query(
      'UPDATE antiban_state SET minute_count = 0, last_minute_reset = NOW() WHERE phone_number = $1',
      [phoneNumber]
    );
    state.minute_count = 0;
  }

  return { allowed: true };
}

/**
 * Record a sent message (increment counters).
 */
export async function recordSend(phoneNumber) {
  await pool.query(
    `UPDATE antiban_state 
     SET daily_count = daily_count + 1,
         hourly_count = hourly_count + 1,
         minute_count = minute_count + 1,
         total_sent = total_sent + 1,
         last_sent = NOW()
     WHERE phone_number = $1`,
    [phoneNumber]
  );
}

/**
 * Health check — returns risk score for a session.
 * Higher = worse. Based on: warm-up day, error rate, recent activity.
 */
export async function getHealth(phoneNumber) {
  const state = await getAntibanState(phoneNumber);
  const dailyLimit = getWarmupDailyLimit(state.warmup_day);

  let risk = 0;
  if (state.warmup_day < 3) risk += 30;          // Very new number
  if (state.daily_count > dailyLimit * 0.8) risk += 20; // Close to limit
  if ((state.error_count || 0) > 5) risk += 30;   // Recent errors
  if (state.disconnect_count > 3) risk += 20;     // Flaky connection

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
