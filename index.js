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

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.post('/connect', requireApiKey, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) return res.status(400).json({ error: 'Invalid phone number format' });

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
        instructions: 'WhatsApp → Linked Devices → Link with phone number instead',
      });
    } else {
      return res.json({ status: 'already_registered', phone: cleanPhone });
    }
  } catch (err) {
    console.error('Connect error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/status/:phone', requireApiKey, (req, res) => {
  const cleanPhone = req.params.phone.replace(/\D/g, '');
  res.json({ phone: cleanPhone, active: listSessions().includes(cleanPhone) });
});

app.get('/sessions', requireApiKey, (req, res) => {
  res.json({ count: sessionCount(), sessions: listSessions() });
});

app.post('/disconnect', requireApiKey, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  const cleanPhone = phone.replace(/\D/g, '');
  const removed = await removeSession(cleanPhone);
  res.json({ phone: cleanPhone, removed });
});

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: settings.botName,
    activeSessions: sessionCount(),
    uptime: process.uptime(),
  });
});

async function bootstrap() {
  const dbReady = await initDatabase();
  if (!dbReady) {
    console.error('❌ Cannot start without database');
    process.exit(1);
  }

  try {
    const { rows } = await pool.query(
      "SELECT DISTINCT phone_number FROM auth_state WHERE key LIKE 'creds%'"
    );
    console.log(`🔍 Found ${rows.length} existing session(s) in database`);

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
  const HOST = '0.0.0.0'; // Required for Railway/Docker

  app.listen(PORT, HOST, () => {
    console.log(`\n🚀 ${settings.botName} API running on http://${HOST}:${PORT}`);
    console.log(`📡 Active sessions: ${sessionCount()}`);
    console.log(`🌍 CORS origin: ${process.env.CORS_ORIGIN || '*'}\n`);
  });
}

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});

bootstrap();
