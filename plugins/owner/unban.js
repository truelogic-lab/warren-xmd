import { resolveTarget, num } from '../group/_helpers.js';
import { unbanUser } from '../../lib/database.js';

export default {
  name: "Unban",
  triggers: ["unban"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Reply, mention, or provide a number.");
    const number = num(target);
    try {
      await unbanUser(number, 'global');
      await ctx.reply(`✅ Unbanned *${number}*`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
