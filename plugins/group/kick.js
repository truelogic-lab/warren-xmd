import { resolveTarget, invalidateGroup, num } from './_helpers.js';

export default {
  name: "Kick",
  triggers: ["kick", "remove"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply(`❌ Reply, mention, or provide a number.\nExample: ${ctx.settings.prefix}kick @user`);
    try {
      await ctx.sock.groupParticipantsUpdate(ctx.from, [target], "remove");
      invalidateGroup(ctx.from);
      await ctx.reply(`✅ Removed @${num(target)}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
