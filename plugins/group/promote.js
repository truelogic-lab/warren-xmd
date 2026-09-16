import { resolveTarget, invalidateGroup, num } from './_helpers.js';

export default {
  name: "Promote",
  triggers: ["promote", "p"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Reply, mention, or provide a number.");
    try {
      await ctx.sock.groupParticipantsUpdate(ctx.from, [target], "promote");
      invalidateGroup(ctx.from);
      await ctx.reply(`👑 Promoted @${num(target)} to admin.`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
