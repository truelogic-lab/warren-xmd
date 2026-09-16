import { pool } from '../../lib/database.js';

export default {
  name: "BanList",
  triggers: ["banlist", "banned"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    try {
      const { rows } = await pool.query(
        'SELECT user_number, group_jid, reason, banned_at FROM banned_users ORDER BY banned_at DESC LIMIT 100'
      );
      if (!rows.length) return ctx.reply("✅ No banned users.");
      let msg = `🚫 *Banned Users (${rows.length})*\n\n`;
      rows.forEach((r, i) => {
        msg += `${i + 1}. ${r.user_number}`;
        if (r.group_jid !== 'global') msg += ` (in group)`;
        if (r.reason) msg += ` — ${r.reason}`;
        msg += '\n';
      });
      await ctx.reply(msg);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
