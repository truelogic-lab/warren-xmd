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
} from '@whiskeysockets/baileys';
import usePostgresAuthState from 'pg2s-baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import settings from '../settings.js';
import { handleMessage, loadPlugins, trackSentMessage } from './handler.js';
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
import { registerSession, unregisterSession, recordActivity } from './watchdog.js';

const sessions = new Map();
const cleanups = new Map();
const reconnectTimers = new Map();

const connOptions = { connectionString: process.env.DATABASE_URL };
const baileysUtils = { proto, initAuthCreds, BufferJSON };

const errorCounters = new Map();
const MAX_ERRORS_PER_SESSION = 50;

function shouldLogError(phoneNumber) {
  const count = (errorCounters.get(phoneNumber) || 0) + 1;
  errorCounters.set(phoneNumber, count);
  if (count <= MAX_ERRORS_PER_SESSION) return true;
  if (count === MAX_ERRORS_PER_SESSION + 1) {
    console.warn('⚠️ Error logging capped for ' + phoneNumber);
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

const sessionFlags = new Map();

function getFlags(phoneNumber) {
  if (!sessionFlags.has(phoneNumber)) {
    sessionFlags.set(phoneNumber, {
      received515: false,
      connectAttempts: 0,
    });
  }
  return sessionFlags.get(phoneNumber);
}

async function destroySocket(phoneNumber) {
  const timer = reconnectTimers.get(phoneNumber);
  if (timer) {
    clearTimeout(timer);
    reconnectTimers.delete(phoneNumber);
  }

  unregisterSession(phoneNumber);

  const cleanup = cleanups.get(phoneNumber);
  if (cleanup) {
    try { cleanup(); } catch (e) {
      console.error('Cleanup error ' + phoneNumber + ':', e.message);
    }
    cleanups.delete(phoneNumber);
  }

  sessions.delete(phoneNumber);
  cache.del('connected:' + phoneNumber);
}

export async function createSession(phoneNumber, plugins = null) {
  if (sessions.has(phoneNumber)) {
    const existing = sessions.get(phoneNumber);
    if (existing.sock?.user || existing.sock?.authState?.creds) {
      return existing;
    }
    console.log('♻️ Removing dead session for ' + phoneNumber);
    await destroySocket(phoneNumber);
  }

  const loadedPlugins = plugins || await loadPlugins('./plugins');
  const flags = getFlags(phoneNumber);

  let state, saveCreds, resetSession;
  try {
    const authResult = await usePostgresAuthState(connOptions, phoneNumber, baileysUtils);
    state = authResult.state;
    saveCreds = authResult.saveCreds;
    resetSession = authResult.resetSession || authResult.deleteSession;
  } catch (err) {
    console.error('❌ Auth state failed for ' + phoneNumber + ':', err.message);
    throw err;
  }

  if (!state?.creds) {
    throw new Error('Auth state not ready for ' + phoneNumber);
  }

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '22.04.4'],
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    getMessage: async () => undefined,
  });

  const originalSend = sock.sendMessage.bind(sock);

  sock.sendMessage = async (jid, content, options = {}) => {
    return enqueue(phoneNumber, async () => {
      try {
        const check = await canSend(phoneNumber, 'MODERATE');
        if (!check.allowed) {
          console.log('⏸️ [' + phoneNumber + '] Send blocked: ' + check.reason);
          if (check.waitMs) {
            await new Promise(r => setTimeout(r, Math.min(check.waitMs, 10000)));
          } else {
            throw new Error('Antiban: ' + check.reason);
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
        if (result?.key?.id) {
          trackSentMessage(result.key.id);
        }
        await recordSend(phoneNumber).catch(() => {});
        return result;
      } catch (err) {
        if (shouldLogError(phoneNumber)) {
          console.error('[' + phoneNumber + '] send error:', err.message);
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

  let isReconnecting = false;

  const scheduleReconnect = (delayMs, reason) => {
    const timer = setTimeout(async () => {
      reconnectTimers.delete(phoneNumber);
      isReconnecting = false;
      try {
        const s = await createSession(phoneNumber, loadedPlugins);
        attachMessageHandler(s);
      } catch (e) {
        console.error('Reconnect failed ' + phoneNumber + ' (' + reason + '):', e.message);
      }
    }, delayMs);

    reconnectTimers.set(phoneNumber, timer);
  };

  const connectionHandler = async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      await pool.query(
        'UPDATE antiban_state SET disconnect_count = disconnect_count + 1 WHERE phone_number = $1',
        [phoneNumber]
      ).catch(() => {});

      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;

      // 515 — restart required (immediate reconnect)
      if (code === 515) {
        console.log('🔄 Session ' + phoneNumber + ' received 515 — reconnecting in 500ms');
        flags.received515 = true;

        await destroySocket(phoneNumber);
        isReconnecting = false;
        scheduleReconnect(500, '515 restart');
        return;
      }

      // 401 right after 515 = transient during pairing
      if (code === 401 && flags.received515) {
        console.log('⚠️ Session ' + phoneNumber + ' got 401 after 515 — retrying');
        flags.received515 = false;
        flags.connectAttempts++;

        if (flags.connectAttempts <= 3) {
          await destroySocket(phoneNumber);
          isReconnecting = false;
          scheduleReconnect(2000, '401-after-515 retry');
          return;
        }

        console.log('❌ Session ' + phoneNumber + ' failed ' + flags.connectAttempts + ' times — giving up');
      }

      // Terminal
      if (TERMINAL_REASONS.includes(code)) {
        console.log('❌ Session ' + phoneNumber + ' terminated permanently (code ' + code + ').');
        try {
          if (resetSession) await resetSession();
        } catch (e) {
          console.error('Reset session error ' + phoneNumber + ':', e.message);
        }
        await pool.query(
          'DELETE FROM auth_state WHERE phone_number = $1',
          [phoneNumber]
        ).catch(() => {});
        await pool.query(
          'UPDATE antiban_state SET welcomed = FALSE WHERE phone_number = $1',
          [phoneNumber]
        ).catch(() => {});
        await destroySocket(phoneNumber);
        sessionFlags.delete(phoneNumber);
        return;
      }

      // Transient
      if (isReconnecting) return;
      isReconnecting = true;

      let backoff = 5000;
      if (code === 405) backoff = 30000;
      if (code === 428) backoff = 20000;
      if (code === 440) backoff = 15000;

      console.log('🔄 Session ' + phoneNumber + ' reconnecting in ' + (backoff / 1000) + 's (code ' + code + ')...');

      await destroySocket(phoneNumber);
      scheduleReconnect(backoff, 'transient ' + code);

    } else if (connection === 'open') {
      console.log('✅ Session ' + phoneNumber + ' connected');
      resetErrorCounter(phoneNumber);
      flags.received515 = false;
      flags.connectAttempts = 0;

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
          isFirstConnect = !cache.get('connected:' + phoneNumber);
        }

        const time = new Date().toLocaleString('en-KE', {
          timeZone: settings.timezone || 'Africa/Nairobi',
        });

        const NL = String.fromCharCode(10);
        let messageText;

        if (isFirstConnect) {
          messageText =
            '╭━━━ 🤖 *' + settings.botName + '* ━━━╮' + NL +
            NL +
            '👋 *Welcome!*' + NL +
            NL +
            '✅ Your bot is now connected' + NL +
            '🚀 Everything is up and running' + NL +
            NL +
            '📖 *Get started:*' + NL +
            '▸ Type *.menu* to see all commands' + NL +
            '▸ Type *.ping* to test the bot' + NL +
            '▸ Type *.help* for assistance' + NL +
            NL +
            '💡 *Tip:* Commands work in private chats and groups.' + NL +
            NL +
            '🌐 *Manage your session:*' + NL +
            '▸ https://warren-xmd.vercel.app' + NL +
            NL +
            '_Keep this number secure. Never share your pairing code._' + NL +
            NL +
            '╰━━━━━━━━━━━━━━━━╯';
        } else {
          messageText =
            '╭━━━ 🔄 *' + settings.botName + '* ━━━╮' + NL +
            NL +
            '✅ *Back online*' + NL +
            NL +
            'Your bot reconnected successfully.' + NL +
            'All commands are working again.' + NL +
            NL +
            '⏱️ *Time:* ' + time + NL +
            NL +
            '_No action needed — this is just a confirmation._' + NL +
            NL +
            '╰━━━━━━━━━━━━━━━━╯';
        }

        try {
          const sent = await sock.sendMessage(botJid, { text: messageText });
          if (sent?.key?.id) {
            trackSentMessage(sent.key.id);
          }
          await pool.query(
            'UPDATE antiban_state SET welcomed = TRUE WHERE phone_number = $1',
            [phoneNumber]
          ).catch(() => {});
          cache.set('connected:' + phoneNumber, true, 86400000 * 365);
          console.log(
            isFirstConnect
              ? '👋 Welcome sent to ' + phoneNumber
              : '🔄 Reconnect notice sent to ' + phoneNumber
          );
        } catch (err) {
          if (shouldLogError(phoneNumber)) {
            console.error('Connection message failed for ' + phoneNumber + ':', err.message);
          }
        }
      }
    }
  };

  sock.ev.on('connection.update', connectionHandler);

  cleanups.set(phoneNumber, () => {
    const timer = reconnectTimers.get(phoneNumber);
    if (timer) {
      clearTimeout(timer);
      reconnectTimers.delete(phoneNumber);
    }
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

  // Register watchdog — forces reconnect if session goes silent
  registerSession(phoneNumber, async () => {
    console.log('🐕 Watchdog forcing reconnect for ' + phoneNumber);
    try { sock.end(undefined); } catch {}
  });

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
            console.error('[' + phoneNumber + '] handler:', err.message);
          }
        });
      }
    } catch (err) {
      if (shouldLogError(phoneNumber)) {
        console.error('[' + phoneNumber + '] handler:', err.message);
      }
    }
  };

  sock.ev.on('messages.upsert', safe(async ({ messages, type }) => {
    if (type !== 'notify') return;

    if (messages.length > 0) {
      recordActivity(phoneNumber);
    }

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
          console.error('[' + phoneNumber + '] handler:', err.message);
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

  console.log('🔌 Handler attached for ' + phoneNumber);
}

export function getSession(phoneNumber) { return sessions.get(phoneNumber); }

export async function removeSession(phoneNumber) {
  const s = sessions.get(phoneNumber);
  if (!s) return false;
  try { await s.sock.logout(); } catch {}
  await destroySocket(phoneNumber);
  sessionFlags.delete(phoneNumber);
  return true;
}

export function listSessions() { return Array.from(sessions.keys()); }
export function sessionCount() { return sessions.size; }
