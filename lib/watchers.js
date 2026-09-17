/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
 */

import { getGroupSettings } from './database.js';

const messageStore = new Map();
const spamStore = new Map();

setInterval(() => {
  const cutoff = Date.now() - 300000;
  for (const [k, v] of messageStore.entries()) {
    if (v.at < cutoff) messageStore.delete(k);
  }
  const spamCutoff = Date.now() - 10000;
  for (const [k, times] of spamStore.entries()) {
    const filtered = times.filter(t => t > spamCutoff);
    if (filtered.length === 0) {
      spamStore.delete(k);
    } else {
      spamStore.set(k, filtered);
    }
  }
}, 60000).unref();

export async function onGroupJoin(sock, update) {
  try {
    const { id: groupJid, participants, action } = update;

    if (action === 'add') {
      const settings = await getGroupSettings(groupJid);
      if (!settings.welcome) return;

      let meta;
      try {
        meta = await sock.groupMetadata(groupJid);
      } catch {
        return;
      }

      const NL = String.fromCharCode(10);
      const defaultWelcome =
        '👋 Welcome @user to *@group*!' + NL +
        NL +
        'You are member #@count';

      for (const jid of participants) {
        const num = jid.split('@')[0];
        const template = settings.welcome_msg || defaultWelcome;
        const text = template
          .replace(/@user/g, '@' + num)
          .replace(/@group/g, meta.subject)
          .replace(/@count/g, String(meta.participants.length));

        await sock.sendMessage(groupJid, {
          text,
          mentions: [jid],
        });
      }
    } else if (action === 'remove') {
      const settings = await getGroupSettings(groupJid);
      if (!settings.goodbye) return;

      let meta;
      try {
        meta = await sock.groupMetadata(groupJid);
      } catch {
        return;
      }

      const NL = String.fromCharCode(10);
      const defaultGoodbye =
        '👋 Goodbye @user from *@group*!' + NL +
        NL +
        'We will miss you.';

      for (const jid of participants) {
        const num = jid.split('@')[0];
        const template = settings.goodbye_msg || defaultGoodbye;
        const text = template
          .replace(/@user/g, '@' + num)
          .replace(/@group/g, meta.subject);

        await sock.sendMessage(groupJid, {
          text,
          mentions: [jid],
        });
      }
    }
  } catch (err) {
    console.error('onGroupJoin error:', err.message);
  }
}

export async function onMessageWatch(sock, m) {
  try {
    const from = m.key.remoteJid;
    if (!from || !from.endsWith('@g.us')) return;
    if (m.key.fromMe) return;

    const settings = await getGroupSettings(from);
    const sender = m.key.participant;
    if (!sender) return;

    let meta;
    try {
      meta = await sock.groupMetadata(from);
    } catch {
      return;
    }

    const participant = meta.participants.find(p => p.id === sender);
    const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
    if (isAdmin) return;

    const text = (
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      m.message?.imageMessage?.caption ||
      m.message?.videoMessage?.caption ||
      ''
    );

    // ANTILINK
    if (settings.antilink && text) {
      const linkRegex = /(chat\.whatsapp\.com|wa\.me|https?:\/\/|t\.me)/i;
      if (linkRegex.test(text)) {
        try {
          await sock.sendMessage(from, { delete: m.key });
          await sock.sendMessage(from, {
            text: '⚠️ @' + sender.split('@')[0] + ' links are not allowed!',
            mentions: [sender],
          });
        } catch {}
        return;
      }
    }

    // ANTIBOT
    if (settings.antibot && text) {
      const botPatterns = /(\.ping|\.menu|\.alive|\.help|\[BOT\]|🤖)/i;
      if (botPatterns.test(text)) {
        try {
          await sock.sendMessage(from, { delete: m.key });
        } catch {}
        return;
      }
    }

    // ANTISPAM
    if (settings.antispam) {
      const key = from + ':' + sender;
      const now = Date.now();
      const times = (spamStore.get(key) || []).filter(t => now - t < 3000);
      times.push(now);
      spamStore.set(key, times);

      if (times.length > 5) {
        try {
          await sock.sendMessage(from, { delete: m.key });
          await sock.sendMessage(from, {
            text: '⚠️ @' + sender.split('@')[0] + ' stop spamming!',
            mentions: [sender],
          });
        } catch {}
        spamStore.set(key, []);
        return;
      }
    }
  } catch (err) {
    console.error('onMessageWatch error:', err.message);
  }
}

export async function onMessageRevoke(sock, revoke) {
  try {
    if (!revoke.keys?.length) return;
    const key = revoke.keys[0];
    const from = key.remoteJid;
    if (!from || !from.endsWith('@g.us')) return;

    const settings = await getGroupSettings(from);
    if (!settings.antidelete) return;

    const storeKey = from + ':' + key.id;
    const cached = messageStore.get(storeKey);
    if (!cached) return;

    const NL = String.fromCharCode(10);
    const text =
      '🗑️ *Deleted message detected*' + NL +
      NL +
      '👤 From: @' + cached.sender.split('@')[0] + NL +
      '📝 Content: ' + (cached.text || '(media)');

    await sock.sendMessage(from, {
      text,
      mentions: [cached.sender],
    });
    messageStore.delete(storeKey);
  } catch (err) {
    console.error('onMessageRevoke error:', err.message);
  }
}

export function onMessageStore(m) {
  try {
    const from = m.key.remoteJid;
    if (!from || !from.endsWith('@g.us')) return;
    if (m.key.fromMe) return;

    const text = (
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      ''
    );
    const sender = m.key.participant;
    if (!sender) return;

    const storeKey = from + ':' + m.key.id;
    messageStore.set(storeKey, { text, sender, at: Date.now() });
  } catch {}
}

export async function onCall(sock, calls) {
  try {
    for (const call of calls) {
      const settings = await getGroupSettings('global');
      if (!settings.anticall) continue;

      if (call.status === 'offer') {
        try {
          await sock.rejectCall(call.id, call.from);
          await sock.sendMessage(call.from, {
            text: '📵 Calls are not allowed. Please text instead.',
          });
        } catch {}
      }
    }
  } catch (err) {
    console.error('onCall error:', err.message);
  }
}
