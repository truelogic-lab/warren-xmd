import { resolveTarget, num } from './_helpers.js';

export default {
  name: "Tag",
  triggers: ["tag"],
  category: "group",
  group: true,
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Reply, mention, or provide a number.");
    const msg = ctx.text.replace(ctx.args[0] || '', '').trim() || `👋 Hey @${num(target)}`;
    await ctx.sock.sendMessage(ctx.from, { text: msg, mentions: [target] }, { quoted: ctx.m });
  }
};
