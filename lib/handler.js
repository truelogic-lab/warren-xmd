/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
 */

import fs from 'fs-extra';
import path from 'path';
import { pathToFileURL } from 'url';
import settings from '../settings.js';
import { cache, TTL, KEYS } from './cache.js';

// Random emojis used to react when a command is received
const REACT_EMOJIS = ['⏳', '🔥', '⚡', '🎯', '💫', '✨', '🚀', '👀', '🤖', '💎', '🌟', '⚙️', '📡', '🧠'];
const randomEmoji = () => REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];

const CATEGORY_EMOJIS = {
  group: '👥',
  owner: '👑',
  admin: '🛡️',
  main: '🤖',
  download: '📥',
  tools: '🛠️',
  ai: '🧠',
  fun: '🎉',
};

export async function loadPlugins(dir = './plugins') {
  const plugins = [];
  const absDir = path.resolve(dir);
  if (!(await fs.pathExists(absDir))) return plugins;

  const categories = await fs.readdir(absDir);

  for (const cat of categories) {
    const catPath = path.join(absDir, cat);
    const stat = await fs.stat(catPath);
    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(catPath);
    for (const file of files) {
      if (!file.endsWith('.js')) continue;
      if (file.startsWith('_')) continue;

      const filePath = path.join(catPath, file);
      try {
        const mod = await import(pathToFileURL(filePath).href);
        const plugin = mod.default;
        if (!plugin || !plugin.triggers) continue;

        if (typeof plugin.triggers === 'string') plugin.triggers = [plugin.triggers];
        plugin.triggers = plugin.triggers.map(t => t.toLowerCase());
        if (!plugin.category) plugin.category = cat;
        plugin.__file = filePath;
        plugins.push(plugin);
      } catch (err) {
        console.error(`❌ ${cat}/${file}:`, err.message);
      }
    }
  }

  console.log(`📦 Loaded ${plugins.length} command(s) from ${categories.length} categories`);
  buildTriggerIndex(plugins);
  return plugins;
}

/**
 * Build a trigger → plugin lookup map so handleMessage doesn't have to
 * linear-scan the whole plugin array on every single incoming message.
 * Attached as a non-enumerable property so `plugins` still behaves like
 * a plain array everywhere else it's used (e.g. the menu command).
 */
export function buildTriggerIndex(plugins) {
  const map = new Map();
  for (const p of plugins) {
    for (const t of p.triggers) {
      if (!map.has(t)) map.set(t, p); // first match wins, same as .find()
    }
  }
  Object.defineProperty(plugins, '__triggerIndex', {
    value: map,
    writable: true,
    configurable: true,
    enumerable: false,
  });
  return map;
}

function extractText(m) {
  const msg = m.message;
  if (!msg) return '';
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    ''
  ).trim();
}

export async function getOwners() {
  const cached = cache.get(KEYS.owners());
  if (cached) return cached;

  let list = [];
  try {
    const data = await fs.readJson('./data/owner.json');
    list = [...(data.owners || []), ...(data.sudo || [])];
  } catch {}

  if (list.length === 0 && settings.ownerNumber) list.push(settings.ownerNumber);
  const normalized = list.map(n => String(n).replace(/\D/g, ''));
  cache.set(KEYS.owners(), normalized, TTL.OWNERS);
  return normalized;
}

export function invalidateOwnersCache() {
  cache.del(KEYS.owners());
}

async function getGroupMeta(sock, jid) {
  const cached = cache.get(KEYS.groupMeta(jid));
  if (cached) return cached;
  const meta = await sock.groupMetadata(jid);
  cache.set(KEYS.groupMeta(jid), meta, TTL.GROUP_META);
  return meta;
}

export function invalidateGroupCache(jid) {
  cache.del(KEYS.groupMeta(jid));
  cache.del(KEYS.adminList(jid));
}

async function isAdmin(sock, groupJid, senderJid) {
  const cached = cache.get(KEYS.adminList(groupJid));
  if (cached) return cached.includes(senderJid);

  try {
    const meta = await getGroupMeta(sock, groupJid);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    cache.set(KEYS.adminList(groupJid), admins, TTL.ADMIN_LIST);
    return admins.includes(senderJid);
  } catch {
    return false;
  }
}

const processedIds = new Set();
setInterval(() => processedIds.clear(), 300000).unref();

export async function handleMessage(sock, m, plugins) {
  try {
    const from = m.key.remoteJid;
    if (!from) return;

    const msgId = m.key.id;
    if (processedIds.has(msgId)) return;
    processedIds.add(msgId);

    const isGroup = from.endsWith('@g.us');
    const botJid = sock.user?.id || '';
    const botNumber = botJid.split('@')[0].split(':')[0];

    let sender;
    if (m.key.fromMe) sender = botJid;
    else if (isGroup) sender = m.key.participant || m.participant || from;
    else sender = from;
    const senderNumber = (sender || '').split('@')[0].split(':')[0];

    const text = extractText(m);
    if (!text) return;

    const owners = await getOwners();
    const isOwner = owners.includes(senderNumber) || senderNumber === botNumber;

    if (settings.mode === 'private' && !isOwner) return;
    if (!text.startsWith(settings.prefix)) return;

    const [rawCmd, ...args] = text.slice(settings.prefix.length).trim().split(/\s+/);
    const command = (rawCmd || '').toLowerCase();
    if (!command) return;

    const index = plugins.__triggerIndex || buildTriggerIndex(plugins);
    const plugin = index.get(command);
    if (!plugin) return;

    try {
      const emoji = CATEGORY_EMOJIS[plugin.category] || randomEmoji();
      await sock.sendMessage(from, {
        react: { text: emoji, key: m.key }
      });
    } catch {}

    if (plugin.owner && !isOwner) {
      return sock.sendMessage(from, { text: settings.messages.ownerOnly }, { quoted: m });
    }
    if (plugin.group && !isGroup) {
      return sock.sendMessage(from, { text: settings.messages.groupOnly }, { quoted: m });
    }
    if (plugin.private && isGroup) {
      return sock.sendMessage(from, { text: settings.messages.privateOnly }, { quoted: m });
    }
    if (plugin.admin) {
      if (!isGroup) {
        return sock.sendMessage(from, { text: settings.messages.groupOnly }, { quoted: m });
      }
      const ok = isOwner || await isAdmin(sock, from, sender);
      if (!ok) {
        return sock.sendMessage(from, { text: settings.messages.adminOnly }, { quoted: m });
      }
    }

    const ctx = {
      sock, m, from, sender, senderNumber, isGroup, isOwner, botNumber,
      args, text: args.join(' '), command, plugins, settings,
      cache, cacheKeys: KEYS,
      reply: (content) => {
        const payload = typeof content === 'string' ? { text: content } : content;
        return sock.sendMessage(from, payload, { quoted: m });
      },
      send: (jid, content, opts = {}) => {
        const payload = typeof content === 'string' ? { text: content } : content;
        return sock.sendMessage(jid, payload, opts);
      },
    };

    plugin.code(ctx).catch(err => {
      console.error(`[${command}] error:`, err.message);
    });
  } catch (err) {
    console.error('handleMessage:', err.message);
  }
}

export async function reloadPlugin(filePath) {
  try {
    const mod = await import(pathToFileURL(filePath).href + `?v=${Date.now()}`);
    if (mod.default?.triggers) {
      if (typeof mod.default.triggers === 'string') mod.default.triggers = [mod.default.triggers];
      mod.default.triggers = mod.default.triggers.map(t => t.toLowerCase());
      mod.default.__file = filePath;
      return mod.default;
    }
  } catch (err) {
    console.error(`Reload failed: ${err.message}`);
  }
  return null;
}
