import { getGroupSettings, updateGroupSetting } from '../../lib/database.js';
import { cache, TTL, KEYS } from '../../lib/cache.js';

/**
 * Get mentioned/replied user as a JID.
 * Priority: mention > reply > raw number in args
 */
export function resolveTarget(m, args = []) {
  const ctx = m.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctx?.mentionedJid || [];
  const replied = ctx?.participant;

  if (mentioned[0]) return mentioned[0];
  if (replied) return replied;
  if (args[0]) {
    const num = args[0].replace(/\D/g, '');
    if (num.length >= 10) return `${num}@s.whatsapp.net`;
  }
  return null;
}

/**
 * Cached group metadata.
 */
export async function getMeta(sock, jid) {
  const key = KEYS.groupMeta(jid);
  const cached = cache.get(key);
  if (cached) return cached;
  const meta = await sock.groupMetadata(jid);
  cache.set(key, meta, TTL.GROUP_META);
  return meta;
}

/**
 * Invalidate cache after a group change.
 */
export function invalidateGroup(jid) {
  cache.del(KEYS.groupMeta(jid));
  cache.del(KEYS.adminList(jid));
}

/**
 * Get cached group settings (antilink, welcome, etc.)
 */
export async function getSettings(groupJid) {
  const key = `gsettings:${groupJid}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const settings = await getGroupSettings(groupJid);
  cache.set(key, settings, 15000);
  return settings;
}

export function invalidateSettings(groupJid) {
  cache.del(`gsettings:${groupJid}`);
}

/**
 * Toggle a boolean setting and reply.
 */
export async function toggleSetting(ctx, field, label) {
  const current = await getSettings(ctx.from);
  const newValue = !current[field];
  await updateGroupSetting(ctx.from, field, newValue);
  invalidateSettings(ctx.from);
  await ctx.reply(`✅ *${label}* ${newValue ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Format a phone/JID to just the number.
 */
export function num(jid) {
  return (jid || '').split('@')[0].split(':')[0];
}

/**
 * Check if bot is admin in the group.
 */
export async function botIsAdmin(sock, jid) {
  try {
    const meta = await getMeta(sock, jid);
    const botJid = sock.user?.id;
    const p = meta.participants.find(x => x.id === botJid);
    return p?.admin === 'admin' || p?.admin === 'superadmin';
  } catch { return false; }
}
