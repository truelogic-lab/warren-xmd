import makeWASocket, {
  DisconnectReason,
  proto,
  initAuthCreds,
  BufferJSON,
} from '@whiskeysockets/baileys';
import usePostgresAuthState from 'pg2s-baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import { handleMessage, loadPlugins } from './handler.js';
import {
  onGroupJoin,
  onMessageWatch,
  onMessageRevoke,
  onMessageStore,
  onCall,
} from './watchers.js';
import { cache } from './cache.js';
import { canSend, recordSend, gaussianJitter } from './antiban.js';
import { pool } from './database.js';

const sessions = new Map();
const connOptions = { connectionString: process.env.DATABASE_URL };
const baileysUtils = { proto, initAuthCreds, BufferJSON };

export async function createSession(phoneNumber, plugins = null) {
  if (sessions.has(phoneNumber)) {
    const existing = sessions.get(phoneNumber);
    if (existing.sock?.user) return existing;
  }

  const loadedPlugins = plugins || await loadPlugins('./plugins');

  let state, saveCreds, resetSession;
  try {
    const authResult = await usePostgresAuthState(connOptions, phoneNumber, baileysUtils);
    state = authResult.state;
    saveCreds = authResult.saveCreds;
    resetSession = authResult.resetSession || authResult.deleteSession;
  } catch (err) {
    console.error(`❌ Auth state failed for ${phoneNumber}:`, err.message);
    throw err;
  }

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  // ============================================
  // ANTIBAN — wrap sendMessage with rate limits + jitter
  // ============================================
  const originalSend = sock.sendMessage.bind(sock);

  sock.sendMessage = async (jid, content, options = {}) => {
    try {
      const check = await canSend(phoneNumber, 'MODERATE');

      if (!check.allowed) {
        console.log(`⏸️ [${phoneNumber}] Send blocked: ${check.reason}`);
        if (check.waitMs) {
          await new Promise(r => setTimeout(r, Math.min(check.waitMs, 10000)));
        } else {
          throw new Error(`Antiban: ${check.reason}`);
        }
      }

      // Gaussian jitter before sending (human-like delay)
      const jitter = gaussianJitter(600, 2000);
      await new Promise(r => setTimeout(r, jitter));

      // Typing indicator for private replies
      if (options.quoted && jid.endsWith('@s.whatsapp.net')) {
        try {
          await sock.sendPresenceUpdate('composing', jid);
          await new Promise(r => setTimeout(r, gaussianJitter(300, 1200)));
          await sock.sendPresenceUpdate('paused', jid);
        } catch {}
      }

      const result = await originalSend(jid, content, options);
      await recordSend(phoneNumber).catch(() => {});
      return result;
    } catch (err) {
      await pool.query(
        'UPDATE antiban_state SET error_count = error_count + 1 WHERE phone_number = $1',
        [phoneNumber]
      ).catch(() => {});
      throw err;
    }
  };

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      // Track disconnect for health monitoring
      pool.query(
        'UPDATE antiban_state SET disconnect_count = disconnect_count + 1 WHERE phone_number = $1',
        [phoneNumber]
      ).catch(() => {});

      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log(`❌ Session ${phoneNumber} logged out.`);
        try { await resetSession(); } catch {}
        sessions.delete(phoneNumber);
      } else {
        console.log(`🔄 Session ${phoneNumber} reconnecting...`);
        sessions.delete(phoneNumber);
        setTimeout(async () => {
          try {
            const s = await createSession(phoneNumber, loadedPlugins);
            attachMessageHandler(s);
          } catch (e) { console.error(e.message); }
        }, 5000);
      }
    } else if (connection === 'open') {
      console.log(`✅ Session ${phoneNumber} connected`);
    }
  });

  const sessionData = { sock, plugins: loadedPlugins, phoneNumber };
  sessions.set(phoneNumber, sessionData);
  return sessionData;
}

export function attachMessageHandler(sessionData) {
  const { sock, plugins, phoneNumber } = sessionData;

  // ============================================
  // Message events (commands + automation)
  // ============================================
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      if (!m.message) continue;

      // ---- STATUS BROADCAST ----
      if (m.key.remoteJid === 'status@broadcast') {
        if (cache.get('autostatus')) {
          try { await sock.readMessages([m.key]); } catch {}
        }
        continue;
      }

      // ---- AUTOREAD ----
      if (cache.get('autoread') && !m.key.fromMe) {
        try { await sock.readMessages([m.key]); } catch {}
      }

      // ---- AUTOTYPING ----
      if (cache.get('autotyping') && !m.key.fromMe) {
        try {
          await sock.sendPresenceUpdate('composing', m.key.remoteJid);
          setTimeout(() => {
            sock.sendPresenceUpdate('paused', m.key.remoteJid).catch(() => {});
          }, 3000);
        } catch {}
      }

      // ---- AUTOREACT ----
      if (cache.get('autoreact') && !m.key.fromMe) {
        const emojis = ['❤️', '👍', '🔥', '😮', '😂', '🎉', '✨'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        try {
          await sock.sendMessage(m.key.remoteJid, {
            react: { text: emoji, key: m.key }
          });
        } catch {}
      }

      // ---- ANTIDELETE STORE ----
      onMessageStore(m);

      // ---- ANTILINK / ANTIBOT / ANTISPAM ----
      onMessageWatch(sock, m).catch(() => {});

      // ---- COMMAND ROUTER ----
      handleMessage(sock, m, plugins).catch(err => {
        console.error(`[${phoneNumber}] handler error:`, err.message);
      });
    }
  });

  // ============================================
  // Group members join/leave → welcome/goodbye
  // ============================================
  sock.ev.on('group-participants.update', (update) => {
    onGroupJoin(sock, update).catch(() => {});
  });

  // ============================================
  // Message deletion → antidelete
  // ============================================
  sock.ev.on('messages.update', (updates) => {
    for (const u of updates) {
      if (
        u.update?.message === null ||
        u.update?.messageStubType === proto.WebMessageInfo.StubType.REVOKE
      ) {
        onMessageRevoke(sock, { keys: [u.key] }).catch(() => {});
      }
    }
  });

  sock.ev.on('messages.delete', (item) => {
    if (item.keys) onMessageRevoke(sock, item).catch(() => {});
  });

  // ============================================
  // Incoming calls → anticall
  // ============================================
  sock.ev.on('call', (calls) => {
    onCall(sock, calls).catch(() => {});
  });

  console.log(`🔌 Handler attached for ${phoneNumber}`);
}

export function getSession(phoneNumber) { return sessions.get(phoneNumber); }

export async function removeSession(phoneNumber) {
  const s = sessions.get(phoneNumber);
  if (!s) return false;
  try { await s.sock.logout(); } catch {}
  sessions.delete(phoneNumber);
  return true;
}

export function listSessions() { return Array.from(sessions.keys()); }
export function sessionCount() { return sessions.size; }
