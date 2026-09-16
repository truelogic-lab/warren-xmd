import settings from '../../settings.js';
import {
  fancyCached as fancy,
  headerCached as header,
  cmdCached as cmd,
  formatRuntime,
  DIVIDER,
} from '../../lib/fancy.js';

let menuCache = null;
let menuCacheTime = 0;
const MENU_TTL = 30000;

export default {
  name: "Menu",
  triggers: ["menu", "help", "menus"],
  category: "main",
  code: async (ctx) => {
    const { sock, from, m, plugins } = ctx;

    if (menuCache && Date.now() - menuCacheTime < MENU_TTL) {
      return sock.sendMessage(from, { text: menuCache }, { quoted: m });
    }

    const cats = {};
    for (const p of plugins) {
      const c = p.category || 'misc';
      if (!cats[c]) cats[c] = [];
      cats[c].push(p.triggers[0]);
    }

    const order = ['main', 'owner', 'admin', 'group', 'download', 'tools', 'ai', 'fun'];
    const sortedCats = Object.keys(cats).sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    let menu = `━━━━━━ 🤖 ${fancy("bot info")} ━━━━━━\n`;
    menu += `◉ 🎉 ${settings.botName}\n`;
    menu += `◉ 👑 ᴏᴡɴᴇʀ: ${settings.ownerName}\n`;
    menu += `◉ 📜 ᴄᴏᴍᴍᴀɴᴅs: ${plugins.length}\n`;
    menu += `◉ ⏱️ ʀᴜɴᴛɪᴍᴇ: ${formatRuntime(process.uptime())}\n`;
    menu += `◉ 📦 ᴘʀᴇғɪx: ${settings.prefix}\n`;
    menu += `◉ ⚙️ ᴍᴏᴅᴇ: ${settings.mode}\n`;
    menu += `◉ 🏷️ ᴠᴇʀsɪᴏɴ: ${settings.version}\n\n`;

    for (const cat of sortedCats) {
      menu += `${header(cat)}\n◉\n`;
      for (const c of cats[cat]) menu += `${cmd(c)}\n`;
      menu += `◉\n${DIVIDER}\n`;
    }

    menu += `\n> *© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${settings.ownerName}*`;

    menuCache = menu;
    menuCacheTime = Date.now();

    await sock.sendMessage(from, { text: menu }, { quoted: m });
  }
};
