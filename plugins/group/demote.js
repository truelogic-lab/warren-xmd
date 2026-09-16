import { resolveTarget, invalidateGroup, num } from './_helpers.js';

export default {
  name: "Demote",
  triggers: ["demote"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Reply, mention, or provide a number.");
    try {
      await ctx.sock.groupParticipantsUpdate(ctx.from, [target], "demote");
      invalidateGroup(ctx.from);
      await ctx.reply(`⬇️ Demoted @${num(target)}.`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
