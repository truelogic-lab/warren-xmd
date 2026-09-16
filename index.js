/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
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
} from './lib/session-manager.js';

dotenv.config();

// ============================================
// INSTANCE SHARDING
// Static sharding — every session maps to a fixed instance.
// When INSTANCE_COUNT=1, this instance handles everything (default).
// ============================================
const INSTANCE_ID = parseInt(process.env.INSTANCE_ID || '0');
const INSTANCE_COUNT = parseInt(process.env.INSTANCE_COUNT || '1');

if (INSTANCE_ID >= INSTANCE_COUNT) {
  console.error(`❌ INSTANCE_ID (${INSTANCE_ID}) must be < INSTANCE_COUNT (${INSTANCE_COUNT})`);
  process.exit(1);
}

console.log(`🧩 Instance ${INSTANCE_ID} of ${INSTANCE_COUNT}`);

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// ============================================
// AUTH MIDDLEWARE
// ============================================
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ============================================
// CONNECT — request pairing code
// The instance that receives the /connect request becomes the owner.
// ============================================
app.post('/connect', requireApiKey, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  // In multi-instance mode, only the shard owner should accept /connect
  const shard = parseInt(cleanPhone) % INSTANCE_COUNT;
  if (shard !== INSTANCE_ID) {
    return res.status(409).json({
      error: 'Wrong instance',
      message: `This session belongs to instance ${shard}. Route /connect to the correct backend.`,
      correctInstance: shard,
    });
  }

  try {
    if (listSessions().includes(cleanPhone)) {
      return res.json({ status: 'already_connected', phone: cleanPhone });
    }

    const sessionData = await createSession(cleanPhone);
    attachMessageHandler(sessionData);

    const sock = sessionData.sock;
    await new Promise(r => setTimeout(r, 2000));

    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(cleanPhone);
      return res.json({
        status: 'pairing_code',
        phone: cleanPhone,
        code,
        instance: INSTANCE_ID,
        instructions: 'WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead',
      });
    }

    return res.json({ status: 'already_registered', phone: cleanPhone });
  } catch (err) {
    console.error('Connect error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================
// STATUS — check if a session is active
// ============================================
app.get('/status/:phone', requireApiKey, (req, res) => {
  const cleanPhone = req.params.phone.replace(/\D/g, '');
  res.json({
    phone: cleanPhone,
    active: listSessions().includes(cleanPhone),
    instance: INSTANCE_ID,
  });
});

// ============================================
// SESSIONS — list all active sessions (this instance only)
// ============================================
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
    proxies,
  });
});

// ============================================
// DISCONNECT — remove a session
// ============================================
app.post('/disconnect', requireApiKey, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  const cleanPhone = phone.replace(/\D/g, '');

  const removed = await removeSession(cleanPhone);
  res.json({ phone: cleanPhone, removed, instance: INSTANCE_ID });
});

// ============================================
// CLUSTER — global view across all instances
// ============================================
app.get('/cluster', requireApiKey, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
         CAST(phone_number AS BIGINT) % $1 AS shard,
         COUNT(*) AS count
       FROM (
         SELECT DISTINCT phone_number FROM auth_state WHERE key LIKE 'creds%'
       ) AS sessions
       GROUP BY shard
       ORDER BY shard`,
      [INSTANCE_COUNT]
    );

    const shards = rows.map(r => ({
      instance: parseInt(r.shard),
      sessions: parseInt(r.count),
      isThisInstance: parseInt(r.shard) === INSTANCE_ID,
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

// ============================================
// CACHE / RELOAD / INVALIDATE — dev tools
// ============================================
app.get('/cache', requireApiKey, async (req, res) => {
  const { cache } = await import('./lib/cache.js');
  res.json({ size: cache.size() });
});

app.post('/reload', requireApiKey, async (req, res) => {
  const { loadPlugins } = await import('./lib/handler.js');
  const plugins = await loadPlugins('./plugins');
  res.json({ reloaded: plugins.length });
});

app.post('/invalidate', requireApiKey, async (req, res) => {
  const { cache } = await import('./lib/cache.js');
  cache.clear();
  res.json({ ok: true });
});

// ============================================
// HEALTH — public health check
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: settings.botName,
    instance: INSTANCE_ID,
    instanceCount: INSTANCE_COUNT,
    activeSessions: sessionCount(),
    uptime: process.uptime(),
  });
});

// ============================================
// BOOTSTRAP — restore only THIS instance's sessions
// ============================================
async function bootstrap() {
  const dbReady = await initDatabase();
  if (!dbReady) {
    console.error('❌ Cannot start without database');
    process.exit(1);
  }

  try {
    // Filter sessions to this shard only
    const { rows } = await pool.query(
      `SELECT DISTINCT phone_number 
       FROM auth_state 
       WHERE key LIKE 'creds%' 
       AND (CAST(phone_number AS BIGINT) % $1) = $2`,
      [INSTANCE_COUNT, INSTANCE_ID]
    );

    console.log(`🔍 Instance ${INSTANCE_ID} owns ${rows.length} session(s)`);

    for (const row of rows) {
      const phone = String(row.phone_number);
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
    console.log(`\n🚀 ${settings.botName} (instance ${INSTANCE_ID}/${INSTANCE_COUNT}) running on http://${HOST}:${PORT}`);
    console.log(`📡 Active sessions: ${sessionCount()}`);
    console.log(`🌍 CORS origin: ${process.env.CORS_ORIGIN || '*'}\n`);
  });
}

// Graceful shutdown
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
