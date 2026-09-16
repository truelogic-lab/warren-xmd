/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
 */
import makeWASocket, {
  DisconnectReason,
  proto,
  initAuthCreds,
  BufferJSON,
} from '@zentrix/baileys';
import usePostgresAuthState from 'pg2s-baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import settings from '../settings.js';
import { handleMessage, loadPlugins } from './handler.js';
import {
  onGroupJoin,
  onMessageWatch,
  onMessageRevoke,
  onMessageStore,
  onCall,
} from './watchers.js';
import { cache } from './cache.js';
import { canSend, recordSend, adaptiveDelay } from './antiban.js';
import { enqueue } from './message-queue.js';
import { pool } from './database.js';

const sessions = new Map();
const cleanups = new Map();

const connOptions = { connectionString: process.env.DATABASE_URL };
const baileysUtils = { proto, initAuthCreds, BufferJSON };

const errorCounters = new Map();
const MAX_ERRORS_PER_SESSION = 50;

function shouldLogError(phoneNumber) {
  const count = (errorCounters.get(phoneNumber) || 0) + 1;
  errorCounters.set(phoneNumber, count);
  if (count <= MAX_ERRORS_PER_SESSION) return true;
  if (count === MAX_ERRORS_PER_SESSION + 1) {
    console.warn(`⚠️ Error logging capped for ${phoneNumber} after ${MAX_ERRORS_PER_SESSION} errors`);
  }
  return false;
}

function resetErrorCounter(phoneNumber) {
  errorCounters.delete(phoneNumber);
}

const TERMINAL_REASONS = [
  DisconnectReason.loggedOut,
  DisconnectReason.badSession,
  DisconnectReason.connectionReplaced,
  DisconnectReason.multideviceMismatch,
];

async function destroySocket(phoneNumber) {
  const cleanup = cleanups.get(phoneNumber);
  if (cleanup) {
    try { cleanup(); } catch (e) {
      console.error(`Cleanup error ${phoneNumber}:`, e.message);
    }
    cleanups.delete(phoneNumber);
  }
  sessions.delete(phoneNumber);
  cache.del(`connected:${phoneNumber}`);
}

export async function createSession(phoneNumber, plugins = null) {
  // FIX — Always destroy any existing session for this number before creating a new one.
  // This prevents the 428 error when pairing a second number while the first
  // pairing session is still in memory.
  if (sessions.has(phoneNumber)) {
    const existing = sessions.get(phoneNumber);
    if (existing.sock?.user) {
      // Fully connected — safe to reuse
      return existing;
    }
    // Stale pairing session — destroy it
    console.log(`♻️ Cleaning up stale pairing session for ${phoneNumber}`);
    await destroySocket(phoneNumber);
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

  if (!state?.creds) {
    throw new Error(`Auth state not ready for ${phoneNumber}`);
  }

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '22.04.4'],
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  const originalSend = sock.sendMessage.bind(sock);

  sock.sendMessage = async (jid, content, options = {}) => {
    return enqueue(phoneNumber, async () => {
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

        const delay = await adaptiveDelay(phoneNumber);
        await new Promise(r => setTimeout(r, delay));

        if (options.quoted && jid.endsWith('@s.whatsapp.net')) {
          try {
            await sock.sendPresenceUpdate('composing', jid);
            await new Promise(r => setTimeout(r, 200 + Math.random() * 500));
            await sock.sendPresenceUpdate('paused', jid);
          } catch {}
        }

        const result = await originalSend(jid, content, options);
        await recordSend(phoneNumber).catch(() => {});
        return result;
      } catch (err) {
        if (shouldLogError(phoneNumber)) {
          console.error(`[${phoneNumber}] send error:`, err.message);
        }
        await pool.query(
          'UPDATE antiban_state SET error_count = error_count + 1 WHERE phone_number = $1',
          [phoneNumber]
        ).catch(() => {});
        throw err;
      }
    });
  };

  sock.ev.on('creds.update', saveCreds);

  let reconnectTimer = null;

  const connectionHandler = async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      pool.query(
        'UPDATE antiban_state SET disconnect_count = disconnect_count + 1 WHERE phone_number = $1',
        [phoneNumber]
      ).catch(() => {});

      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;

      if (TERMINAL_REASONS.includes(code)) {
        console.log(`❌ Session ${phoneNumber} terminated permanently (code ${code}).`);
        try { await resetSession(); } catch {}
        await pool.query(
          'DELETE FROM auth_state WHERE phone_number = $1',
          [phoneNumber]
        ).catch(() => {});
        await pool.query(
          'UPDATE antiban_state SET welcomed = FALSE WHERE phone_number = $1',
          [phoneNumber]
        ).catch(() => {});
        await destroySocket(phoneNumber);
        return;
      }

      let backoff = 5000;
      if (code === 405) backoff = 30000;
      if (code === 515) backoff = 60000;
      if (code === 428) backoff = 20000;

      console.log(`🔄 Session ${phoneNumber} reconnecting in ${backoff / 1000}s (code ${code})...`);

      await destroySocket(phoneNumber);

      reconnectTimer = setTimeout(async () => {
        try {
          const s = await createSession(phoneNumber, loadedPlugins);
          attachMessageHandler(s);
        } catch (e) {
          console.error(`Reconnect failed ${phoneNumber}:`, e.message);
        }
      }, backoff);

    } else if (connection === 'open') {
      console.log(`✅ Session ${phoneNumber} connected`);
      resetErrorCounter(phoneNumber);

      const botJid = sock.user?.id;
      if (botJid) {
        let isFirstConnect = true;
        try {
          const { rows } = await pool.query(
            'SELECT welcomed FROM antiban_state WHERE phone_number = $1',
            [phoneNumber]
          );
          isFirstConnect = !rows[0]?.welcomed;
        } catch {
          isFirstConnect = !cache.get(`connected:${phoneNumber}`);
        }

        const time = new Date().toLocaleString('en-KE', {
          timeZone: settings.timezone || 'Africa/Nairobi',
        });

        let messageText;
        if (isFirstConnect) {
          messageText = [
            `╭━━━ 🤖 *${settings.botName}* ━━━╮`,
            ``,
            `👋 *Welcome!*`,
            ``,
            `✅ Your bot is now connected`,
            `🚀 Everything is up and running`,
            ``,
            `📖 *Get started:*`,
            `▸ Type *.menu* to see all commands`,
            `▸ Type *.ping* to test the bot`,
            `▸ Type *.help* for assistance`,
            ``,
            `💡 *Tip:* Commands work in private chats and groups.`,
            ``,
            `🌐 *Manage your session:*`,
            `▸ https://warren-xmd.vercel.app`,
            ``,
            `_Keep this number secure. Never share your pairing code._`,
            ``,
            `╰━━━━━━━━━━━━━━━━╯`,
          ].join('\n');
        } else {
          messageText = [
            `╭━━━ 🔄 *${settings.botName}* ━━━╮`,
            ``,
            `✅ *Back online*`,
            ``,
            `Your bot reconnected successfully.`,
            `All commands are working again.`,
            ``,
            `⏱️ *Time:* ${time}`,
            ``,
            `_No action needed — this is just a confirmation._`,
            ``,
            `╰━━━━━━━━━━━━━━━━╯`,
          ].join('\n');
        }

        try {
          await sock.sendMessage(botJid, { text: messageText });
          await pool.query(
            'UPDATE antiban_state SET welcomed = TRUE WHERE phone_number = $1',
            [phoneNumber]
          ).catch(() => {});
          cache.set(`connected:${phoneNumber}`, true, 86400000 * 365);
          console.log(
            isFirstConnect
              ? `👋 Welcome sent to ${phoneNumber}`
              : `🔄 Reconnect notice sent to ${phoneNumber}`
          );
        } catch (err) {
          if (shouldLogError(phoneNumber)) {
            console.error(`Connection message failed for ${phoneNumber}:`, err.message);
          }
        }
      }
    }
  };

  sock.ev.on('connection.update', connectionHandler);

  cleanups.set(phoneNumber, () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    try { sock.ev.removeAllListeners('connection.update'); } catch {}
    try { sock.ev.removeAllListeners('creds.update'); } catch {}
    try { sock.ev.removeAllListeners('messages.upsert'); } catch {}
    try { sock.ev.removeAllListeners('group-participants.update'); } catch {}
    try { sock.ev.removeAllListeners('messages.update'); } catch {}
    try { sock.ev.removeAllListeners('messages.delete'); } catch {}
    try { sock.ev.removeAllListeners('call'); } catch {}
    try { sock.end(undefined); } catch {}
  });

  const sessionData = { sock, plugins: loadedPlugins, phoneNumber };
  sessions.set(phoneNumber, sessionData);
  return sessionData;
}

export function attachMessageHandler(sessionData) {
  const { sock, plugins, phoneNumber } = sessionData;

  const safe = (fn) => (...args) => {
    try {
      const result = fn(...args);
      if (result?.catch) {
        result.catch(err => {
          if (shouldLogError(phoneNumber)) {
            console.error(`[${phoneNumber}] handler:`, err.message);
          }
        });
      }
    } catch (err) {
      if (shouldLogError(phoneNumber)) {
        console.error(`[${phoneNumber}] handler:`, err.message);
      }
    }
  };

  sock.ev.on('messages.upsert', safe(async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      if (!m.message) continue;

      if (m.key.remoteJid === 'status@broadcast') {
        if (cache.get('autostatus')) {
          try { await sock.readMessages([m.key]); } catch {}
        }
        continue;
      }

      if (cache.get('autoread') && !m.key.fromMe) {
        try { await sock.readMessages([m.key]); } catch {}
      }

      if (cache.get('autotyping') && !m.key.fromMe) {
        try {
          await sock.sendPresenceUpdate('composing', m.key.remoteJid);
          setTimeout(() => {
            sock.sendPresenceUpdate('paused', m.key.remoteJid).catch(() => {});
          }, 3000);
        } catch {}
      }

      if (cache.get('autoreact') && !m.key.fromMe) {
        const emojis = ['❤️', '👍', '🔥', '😮', '😂', '🎉', '✨'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        try {
          await sock.sendMessage(m.key.remoteJid, {
            react: { text: emoji, key: m.key }
          });
        } catch {}
      }

      onMessageStore(m);
      onMessageWatch(sock, m).catch(() => {});
      handleMessage(sock, m, plugins).catch(err => {
        if (shouldLogError(phoneNumber)) {
          console.error(`[${phoneNumber}] handler:`, err.message);
        }
      });
    }
  }));

  sock.ev.on('group-participants.update', safe((update) => {
    onGroupJoin(sock, update).catch(() => {});
  }));

  sock.ev.on('messages.update', safe((updates) => {
    for (const u of updates) {
      if (
        u.update?.message === null ||
        u.update?.messageStubType === proto.WebMessageInfo.StubType.REVOKE
      ) {
        onMessageRevoke(sock, { keys: [u.key] }).catch(() => {});
      }
    }
  }));

  sock.ev.on('messages.delete', safe((item) => {
    if (item.keys) onMessageRevoke(sock, item).catch(() => {});
  }));

  sock.ev.on('call', safe((calls) => {
    onCall(sock, calls).catch(() => {});
  }));

  console.log(`🔌 Handler attached for ${phoneNumber}`);
}

export function getSession(phoneNumber) { return sessions.get(phoneNumber); }

export async function removeSession(phoneNumber) {
  const s = sessions.get(phoneNumber);
  if (!s) return false;
  try { await s.sock.logout(); } catch {}
  await destroySocket(phoneNumber);
  return true;
}

export function listSessions() { return Array.from(sessions.keys()); }
export function sessionCount() { return sessions.size; }
