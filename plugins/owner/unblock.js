import { resolveTarget, num } from '../group/_helpers.js';

export default {
  name: "Unblock",
  triggers: ["unblock"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Reply, mention, or provide a number.");
    try {
      await ctx.sock.updateBlockStatus(target, 'unblock');
      await ctx.reply(`✅ Unblocked @${num(target)}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
