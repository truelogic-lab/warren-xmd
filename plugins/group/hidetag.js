import { getMeta } from './_helpers.js';

export default {
  name: "HideTag",
  triggers: ["hidetag", "ht"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      const meta = await getMeta(ctx.sock, ctx.from);
      const mentions = meta.participants.map(p => p.id);
      await ctx.sock.sendMessage(ctx.from, { text: ctx.text || '‎', mentions }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
