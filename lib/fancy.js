/**
 * Warren-XMD — Multi-session WhatsApp Bot
 * Copyright (c) 2026 Warren Musungu
 * https://github.com/truelogic-lab/warren-xmd
 */

// Unicode style maps
const SMALL_CAPS = {
  a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',
  k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',
  u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ',
};

const NUMBERS = {
  '0':'𝟶','1':'𝟷','2':'𝟸','3':'𝟹','4':'𝟺',
  '5':'𝟻','6':'𝟼','7':'𝟽','8':'𝟾','9':'𝟿',
};

const BOLD_SERIF = {
  a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',h:'𝐡',i:'𝐢',j:'𝐣',
  k:'𝐤',l:'𝐥',m:'𝐦',n:'𝐧',o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',s:'𝐬',t:'𝐭',
  u:'𝐮',v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳',
  A:'𝐀',B:'𝐁',C:'𝐂',D:'𝐃',E:'𝐄',F:'𝐅',G:'𝐆',H:'𝐇',I:'𝐈',J:'𝐉',
  K:'𝐊',L:'𝐋',M:'𝐌',N:'𝐍',O:'𝐎',P:'𝐏',Q:'𝐐',R:'𝐑',S:'𝐒',T:'𝐓',
  U:'𝐔',V:'𝐕',W:'𝐖',X:'𝐗',Y:'𝐘',Z:'𝐙',
  '0':'𝟎','1':'𝟏','2':'𝟐','3':'𝟑','4':'𝟒','5':'𝟓','6':'𝟔','7':'𝟕','8':'𝟖','9':'𝟗',
};

const ITALIC_SERIF = {
  a:'𝒂',b:'𝒃',c:'𝒄',d:'𝒅',e:'𝒆',f:'𝒇',g:'𝒈',h:'𝒉',i:'𝒊',j:'𝒋',
  k:'𝒌',l:'𝒍',m:'𝒎',n:'𝒏',o:'𝒐',p:'𝒑',q:'𝒒',r:'𝒓',s:'𝒔',t:'𝒕',
  u:'𝒖',v:'𝒗',w:'𝒘',x:'𝒙',y:'𝒚',z:'𝒛',
  A:'𝑨',B:'𝑩',C:'𝑪',D:'𝑫',E:'𝑬',F:'𝑭',G:'𝑮',H:'𝑯',I:'𝑰',J:'𝑱',
  K:'𝑲',L:'𝑳',M:'𝑴',N:'𝑵',O:'𝑶',P:'𝑷',Q:'𝑸',R:'𝑹',S:'𝑺',T:'𝑻',
  U:'𝑼',V:'𝑽',W:'𝑾',X:'𝑿',Y:'𝒀',Z:'𝒁',
};

export function fancy(text) {
  if (!text) return '';
  return String(text).split('').map(c => SMALL_CAPS[c.toLowerCase()] || c).join('');
}

export function fancyNum(text) {
  if (!text) return '';
  return String(text).split('').map(c => NUMBERS[c] || c).join('');
}

export function bold(text) {
  if (!text) return '';
  return String(text).split('').map(c => BOLD_SERIF[c] || c).join('');
}

export function italic(text) {
  if (!text) return '';
  return String(text).split('').map(c => ITALIC_SERIF[c] || c).join('');
}

export function header(text) {
  return `━━━━━『 ${fancy(text)} 』━━━━━`;
}

export function cmd(text) {
  return `◉ ➤ ${fancy(text)}`;
}

export const DIVIDER = '┗━━━━━━━━━━━━━━';
export const BULLET = '◉';

export function formatRuntime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// ---- Cached versions for hot paths ----
const fancyCache = new Map();
const headerCache = new Map();
const cmdCache = new Map();
const MAX_CACHE = 500;

export function fancyCached(text) {
  if (!text) return '';
  if (fancyCache.has(text)) return fancyCache.get(text);
  const r = fancy(text);
  if (fancyCache.size >= MAX_CACHE) fancyCache.clear();
  fancyCache.set(text, r);
  return r;
}

export function headerCached(text) {
  if (!text) return '';
  if (headerCache.has(text)) return headerCache.get(text);
  const r = `━━━━━『 ${fancy(text)} 』━━━━━`;
  if (headerCache.size >= MAX_CACHE) headerCache.clear();
  headerCache.set(text, r);
  return r;
}

export function cmdCached(text) {
  if (!text) return '';
  if (cmdCache.has(text)) return cmdCache.get(text);
  const r = `◉ ➤ ${fancy(text)}`;
  if (cmdCache.size >= MAX_CACHE) cmdCache.clear();
  cmdCache.set(text, r);
  return r;
}

export default {
  fancy, fancyNum, bold, italic, header, cmd,
  fancyCached, headerCached, cmdCached,
  formatRuntime, DIVIDER, BULLET,
};
