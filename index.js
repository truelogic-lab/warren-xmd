/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
 *
 * Hardened version with:
 * - Safer session restore (no BIGINT cast)
 * - Pairing locks + rate limiting
 * - Stricter CORS
 * - Better error handling around pairing
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import settings from './settings.js';
import { initDatabase, closeDatabase, pool } from './lib/database.js';
import {
  createSession,
  attachMessageHandler,
  listSessions,
  sessionCount,
  removeSession,
  getSession,
} from './lib/session-manager.js';

dotenv.config();

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err.message);
});

function startMemoryWatchdog() {
  const LIMIT_MB = 900;
  setInterval(() => {
    const mem = process.memoryUsage();
    const heapMB = mem.heapUsed / 1024 / 1024;
    if (heapMB > LIMIT_MB) {
      console.warn(`⚠️ Heap near limit: ${heapMB.toFixed(0)} MB / ${LIMIT_MB} MB`);
    }
  }, 60000).unref();
}

const INSTANCE_ID = parseInt(process.env.INSTANCE_ID || '0');
const INSTANCE_COUNT = parseInt(process.env.INSTANCE_COUNT || '1');

if (INSTANCE_ID >= INSTANCE_COUNT) {
  console.error(`❌ INSTANCE_ID (${INSTANCE_ID}) must be < INSTANCE_COUNT (${INSTANCE_COUNT})`);
  process.exit(1);
}

console.log(`🧩 Instance ${INSTANCE_ID} of ${INSTANCE_COUNT}`);

const app = express();
app.use(express.json({ limit: '1mb' }));

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));

const pairingLocks = new Map();

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

function checkRateLimit(phone) {
  const now = Date.now();
  const record = rateLimitMap.get(phone);
  if (!record) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true };
  }
  if (now > record.resetAt) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true };
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return {
      ok: false,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }
  record.count += 1;
  return { ok: true };
}

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.post('/connect', requireApiKey, async (req, res) => {
  let cleanPhone = '';
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    cleanPhone = phone.replace(/D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    const limit = checkRateLimit(cleanPhone);
    if (!limit.ok) {
      return res.status(429).json({
        error: 'Too many attempts',
        message: `Too many pairing attempts. Try again in ${limit.retryAfter} seconds.`,
      });
    }

    const lastDigits = parseInt(cleanPhone.slice(-6), 10);
    const shard = isNaN(lastDigits) ? 0 : (lastDigits % INSTANCE_COUNT);
    if (shard !== INSTANCE_ID) {
      return res.status(409).json({
        error: 'Wrong instance',
        message: `This session belongs to instance ${shard}.`,
        correctInstance: shard,
      });
    }

    const existing = getSession(cleanPhone);
    if (existing?.sock?.user) {
      return res.json({
        status: 'already_connected',
        phone: cleanPhone,
        message: 'This number is already linked and active.',
      });
    }

    if (pairingLocks.has(cleanPhone)) {
      return res.status(429).json({
        error: 'Pairing in progress',
        message: 'Another request is already pairing this number. Wait 30 seconds and try again.',
      });
    }

    pairingLocks.set(cleanPhone, Date.now());

    if (existing && !existing.sock?.user) {
      await new Promise(r => setTimeout(r, 500));
      const recheck = getSession(cleanPhone);
      if (recheck?.sock?.user) {
        pairingLocks.delete(cleanPhone);
        return res.json({ status: 'already_connected', phone: cleanPhone });
      }
      console.log(`♻️ Removing dead session for ${cleanPhone}`);
      await removeSession(cleanPhone);
    }

    const sessionData = await createSession(cleanPhone);
    attachMessageHandler(sessionData);

    const sock = sessionData.sock;

    let waited = 0;
    while (waited < 5000 && !sock.authState?.creds) {
      await new Promise(r => setTimeout(r, 200));
      waited += 200;
    }

    await new Promise(r => setTimeout(r, 1500));

    if (!sock.authState.creds.registered) {
      let code;
      try {
        code = await sock.requestPairingCode(cleanPhone);
      } catch (pairErr) {
        console.error('Pairing code error:', pairErr?.message || pairErr);
        pairingLocks.delete(cleanPhone);
        try { await removeSession(cleanPhone); } catch {}
        return res.status(500).json({
          error: 'Pairing failed',
          message: pairErr?.message || 'Failed to generate pairing code',
        });
      }

      pairingLocks.delete(cleanPhone);
      return res.json({
        status: 'pairing_code',
        phone: cleanPhone,
        code,
        instance: INSTANCE_ID,
        instructions: 'WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead',
      });
    }

    pairingLocks.delete(cleanPhone);
    return res.json({ status: 'already_registered', phone: cleanPhone });
  } catch (err) {
    console.error('Connect error:', err);
    if (cleanPhone) pairingLocks.delete(cleanPhone);

    if (cleanPhone) {
      try { await removeSession(cleanPhone); } catch {}
    }

    return res.status(500).json({ error: err.message });
  }
});

app.get('/status/:phone', requireApiKey, (req, res) => {
  const cleanPhone = req.params.phone.replace(/D/g, '');
  const session = getSession(cleanPhone);
  res.json({
    phone: cleanPhone,
    active: !!session?.sock?.user,
    pairing: pairingLocks.has(cleanPhone),
    instance: INSTANCE_ID,
  });
});

app.get('/sessions', requireApiKey, async (req, res) => {
  let proxies = [];
  try {
    const { proxyStats } = await import('./lib/proxy.js');
    proxies = await proxyStats();
  } catch {}

  res.json({
    instance: INSTANCE_ID,
    instanceCount: INSTANCE_COUNT,
    count: sessionCount(),
    sessions: listSessions(),
    pairingInProgress: Array.from(pairingLocks.keys()),
    proxies,
  });
});

app.post('/disconnect', requireApiKey, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  const cleanPhone = phone.replace(/D/g, '');

  const limit = checkRateLimit(cleanPhone);
  if (!limit.ok) {
    return res.status(429).json({
      error: 'Too many attempts',
      message: `Too many disconnect attempts. Try again in ${limit.retryAfter} seconds.`,
    });
  }

  pairingLocks.delete(cleanPhone);
  const removed = await removeSession(cleanPhone);
  res.json({ phone: cleanPhone, removed, instance: INSTANCE_ID });
});

app.get('/cluster', requireApiKey, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT phone_number FROM auth_state WHERE key LIKE 'creds%'`
    );

    const shardCounts = Array.from({ length: INSTANCE_COUNT }, () => 0);

    for (const row of rows) {
      const phone = String(row.phone_number);
      const lastDigits = parseInt(phone.slice(-6), 10);
      const shard = isNaN(lastDigits) ? 0 : (lastDigits % INSTANCE_COUNT);
      shardCounts[shard] += 1;
    }

    const shards = shardCounts.map((count, idx) => ({
      instance: idx,
      sessions: count,
      isThisInstance: idx === INSTANCE_ID,
    }));

    const total = shards.reduce((sum, s) => sum + s.sessions, 0);

    res.json({
      instanceCount: INSTANCE_COUNT,
      thisInstance: INSTANCE_ID,
      totalSessions: total,
      shards,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cache', requireApiKey, async (req, res) => {
  const { cache } = await import('./lib/cache.js');
  res.json({ size: cache.size() });
});

app.post('/reload', requireApiKey, async (req, res) => {
  try {
    const { loadPlugins } = await import('./lib/handler.js');
    const plugins = await loadPlugins('./plugins');
    res.json({ reloaded: plugins.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/invalidate', requireApiKey, async (req, res) => {
  const { cache } = await import('./lib/cache.js');
  cache.clear();
  res.json({ ok: true });
});

app.get('/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    bot: settings.botName,
    instance: INSTANCE_ID,
    instanceCount: INSTANCE_COUNT,
    activeSessions: sessionCount(),
    pairingInProgress: pairingLocks.size,
    uptime: process.uptime(),
    heapUsedMB: parseFloat((mem.heapUsed / 1024 / 1024).toFixed(1)),
    heapTotalMB: parseFloat((mem.heapTotal / 1024 / 1024).toFixed(1)),
  });
});

async function bootstrap() {
  const dbReady = await initDatabase();
  if (!dbReady) {
    console.error('❌ Cannot start without database');
    process.exit(1);
  }

  startMemoryWatchdog();

  try {
    const { rows } = await pool.query(
      `SELECT phone_number
       FROM auth_state
       WHERE key LIKE 'creds%'`
    );

    const ownedPhones = [];

    for (const row of rows) {
      const phone = String(row.phone_number);
      const lastDigits = parseInt(phone.slice(-6), 10);
      const shard = isNaN(lastDigits) ? 0 : (lastDigits % INSTANCE_COUNT);
      if (shard === INSTANCE_ID) {
        ownedPhones.push(phone);
      }
    }

    console.log(`🔍 Instance ${INSTANCE_ID} owns ${ownedPhones.length} session(s)`);

    for (const phone of ownedPhones) {
      try {
        const sessionData = await createSession(phone);
        attachMessageHandler(sessionData);
        console.log(`✅ Restored session: ${phone}`);
      } catch (err) {
        console.error(`❌ Failed to restore ${phone}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Session restore error:', err.message);
  }

  const PORT = process.env.PORT || 3000;
  const HOST = '0.0.0.0';

  app.listen(PORT, HOST, () => {
    console.log(`
🚀 ${settings.botName} (instance ${INSTANCE_ID}/${INSTANCE_COUNT}) running on http://${HOST}:${PORT}`);
    console.log(`📡 Active sessions: ${sessionCount()}`);
    console.log(`🌍 CORS origin: ${corsOrigin}
`);
  });
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received — closing...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received — closing...');
  await closeDatabase();
  process.exit(0);
});

bootstrap();
