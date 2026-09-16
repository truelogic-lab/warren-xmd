import { pool } from '../../lib/database.js';
import { sessionCount } from '../../lib/session-manager.js';
import { fancy } from '../../lib/fancy.js';

export default {
  name: "Stats",
  triggers: ["stats", "systemstats"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    try {
      const [{ rows: gs }, { rows: bu }] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM group_settings'),
        pool.query('SELECT COUNT(*) FROM banned_users'),
      ]);
      const mem = process.memoryUsage();
      let msg = `━━━━━『 ${fancy('system stats')} 』━━━━━\n\n`;
      msg += `📱 Sessions: ${sessionCount()}\n`;
      msg += `👥 Groups tracked: ${gs[0].count}\n`;
      msg += `🚫 Banned users: ${bu[0].count}\n`;
      msg += `⏱️ Uptime: ${Math.floor(process.uptime())}s\n`;
      msg += `💾 Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB\n`;
      msg += `⚙️ Node: ${process.version}\n`;
      await ctx.reply(msg);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
