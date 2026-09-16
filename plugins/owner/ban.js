import { resolveTarget, num } from '../group/_helpers.js';
import { banUser } from '../../lib/database.js';

export default {
  name: "Ban",
  triggers: ["ban"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Reply, mention, or provide a number.");
    const number = num(target);
    const reason = ctx.text.replace(ctx.args[0] || '', '').trim() || null;
    try {
      await banUser(number, 'global', reason);
      await ctx.reply(`🚫 Banned *${number}*${reason ? `\nReason: ${reason}` : ''}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
