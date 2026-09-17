/**
 * Warren-XMD — Session watchdog
 * Detects silent session failures (LID bug) and forces reconnect.
 * Copyright (c) 2026 Warren Musungu
 */

const lastActivity = new Map();
const watchdogTimers = new Map();
const sessionStart = new Map();
const reconnectCallbacks = new Map();

const STALL_THRESHOLD_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;
const MIN_SESSION_AGE_MS = 60 * 1000;

export function recordActivity(phoneNumber) {
  lastActivity.set(phoneNumber, Date.now());
}

export function registerSession(phoneNumber, reconnectFn) {
  sessionStart.set(phoneNumber, Date.now());
  lastActivity.set(phoneNumber, Date.now());
  reconnectCallbacks.set(phoneNumber, reconnectFn);

  if (!watchdogTimers.has(phoneNumber)) {
    const timer = setInterval(() => {
      checkStall(phoneNumber);
    }, CHECK_INTERVAL_MS);
    timer.unref();
    watchdogTimers.set(phoneNumber, timer);
  }
}

export function unregisterSession(phoneNumber) {
  const timer = watchdogTimers.get(phoneNumber);
  if (timer) {
    clearInterval(timer);
    watchdogTimers.delete(phoneNumber);
  }
  lastActivity.delete(phoneNumber);
  sessionStart.delete(phoneNumber);
  reconnectCallbacks.delete(phoneNumber);
}

async function checkStall(phoneNumber) {
  const start = sessionStart.get(phoneNumber);
  const last = lastActivity.get(phoneNumber);
  const cb = reconnectCallbacks.get(phoneNumber);

  if (!start || !last || !cb) return;
  if (Date.now() - start < MIN_SESSION_AGE_MS) return;

  const silenceMs = Date.now() - last;
  if (silenceMs < STALL_THRESHOLD_MS) return;

  console.warn(
    '⏰ Watchdog: session ' + phoneNumber + ' silent for ' +
    Math.round(silenceMs / 1000) + 's — forcing reconnect'
  );

  lastActivity.set(phoneNumber, Date.now());

  try {
    await cb();
    console.log('✅ Watchdog: reconnect triggered for ' + phoneNumber);
  } catch (err) {
    console.error('❌ Watchdog: reconnect failed for ' + phoneNumber + ':', err.message);
  }
}

export function getWatchdogStats() {
  const now = Date.now();
  const stats = [];
  for (const [phone, last] of lastActivity.entries()) {
    stats.push({
      phone,
      lastActivitySecondsAgo: Math.round((now - last) / 1000),
      stalled: (now - last) > STALL_THRESHOLD_MS,
    });
  }
  return stats;
}
