import { getGroupSettings } from './database.js';

/**
 * Called when a member joins or leaves a group.
 * Handles welcome/goodbye messages.
 */
export async function onGroupJoin(sock, update) {
  try {
    const { id: groupJid, participants, action } = update;

    if (action === 'add') {
      const settings = await getGroupSettings(groupJid);
      if (!settings.welcome) return;

      const meta = await sock.groupMetadata(groupJid);
      for (const jid of participants) {
        const num = jid.split('@')[0];
        const template = settings.welcome_msg
          || `👋 Welcome @user to *@group*!\n\nYou are member #@count`;
        const text = template
          .replace(/@user/g, `@${num}`)
          .replace(/@group/g, meta.subject)
          .replace(/@count/g, meta.participants.length);

        await sock.sendMessage(groupJid, {
          text,
          mentions: [jid],
        });
      }
    } else if (action === 'remove') {
      const settings = await getGroupSettings(groupJid);
      if (!settings.goodbye) return;

      const meta = await sock.groupMetadata(groupJid);
      for (const jid of participants) {
        const num = jid.split('@')[0];
        const template = settings.goodbye_msg
          || `👋 Goodbye @user from *@group*!`;
        const text = template
          .replace(/@user/g, `@${num}`)
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

/**
 * Called for every group message.
 * Enforces antilink, antibot, antispam.
 */
export async function onMessageWatch(sock, m) {
  try {
    const from = m.key.remoteJid;
    if (!from || !from.endsWith('@g.us')) return;
    if (m.key.fromMe) return;

    const settings = await getGroupSettings(from);
    const sender = m.key.participant;
    if (!sender) return;

    // Skip admins — they can do anything
    const meta = await sock.groupMetadata(from);
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

    // --- ANTILINK ---
    if (settings.antilink && text) {
      const linkRegex = /(chat\.whatsapp\.com\/|wa\.me\/|https?:\/\/|t\.me\/)/i;
      if (linkRegex.test(text)) {
        try {
          await sock.sendMessage(from, { delete: m.key });
          await sock.sendMessage(from, {
            text: `⚠️ @${sender.split('@')[0]} links are not allowed!`,
            mentions: [sender],
          });
        } catch {}
        return;
      }
    }

    // --- ANTIBOT ---
    if (settings.antibot && text) {
      const botPatterns = /(\.ping|\.menu|\.alive|\.help|\[BOT\]|🤖)/i;
      if (botPatterns.test(text)) {
        try {
          await sock.sendMessage(from, { delete: m.key });
        } catch {}
        return;
      }
    }

    // --- ANTISPAM ---
    if (settings.antispam) {
      const spamStore = global.__spamStore ||= new Map();
      const key = `${from}:${sender}`;
      const now = Date.now();
      const times = (spamStore.get(key) || []).filter(t => now - t < 3000);
      times.push(now);
      spamStore.set(key, times);

      if (times.length > 5) {
        try {
          await sock.sendMessage(from, { delete: m.key });
          await sock.sendMessage(from, {
            text: `⚠️ @${sender.split('@')[0]} stop spamming!`,
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

/**
 * Called when messages are deleted (antidelete).
 * Posts the deleted content back to the group.
 */
export async function onMessageRevoke(sock, revoke) {
  try {
    if (!revoke.keys?.length) return;
    const key = revoke.keys[0];
    const from = key.remoteJid;
    if (!from || !from.endsWith('@g.us')) return;

    const settings = await getGroupSettings(from);
    if (!settings.antidelete) return;

    const store = global.__messageStore ||= new Map();
    const storeKey = `${from}:${key.id}`;
    const cached = store.get(storeKey);
    if (!cached) return;

    await sock.sendMessage(from, {
      text: `🗑️ *Deleted message detected*\n\n👤 From: @${cached.sender.split('@')[0]}\n📝 Content: ${cached.text || '(media)'}`,
      mentions: [cached.sender],
    });
    store.delete(storeKey);
  } catch (err) {
    console.error('onMessageRevoke error:', err.message);
  }
}

/**
 * Store every group message briefly so antidelete can retrieve it.
 * Keeps last 5 minutes only.
 */
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

    const store = global.__messageStore ||= new Map();
    store.set(`${from}:${m.key.id}`, { text, sender, at: Date.now() });

    // Prune entries older than 5 minutes
    const cutoff = Date.now() - 300000;
    for (const [k, v] of store.entries()) {
      if (v.at < cutoff) store.delete(k);
    }
  } catch {}
}

/**
 * Called on incoming calls — auto-rejects if anticall is enabled.
 * Note: anticall uses the 'global' group setting (not per-group)
 * since calls aren't scoped to a group.
 */
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
