import { resolveTarget, num } from '../group/_helpers.js';

export default {
  name: "GetPP",
  triggers: ["getpp", "pp"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args) || ctx.from;
    try {
      const url = await ctx.sock.profilePictureUrl(target, 'image');
      await ctx.sock.sendMessage(ctx.from, { image: { url } }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message || 'No profile picture'}`);
    }
  }
};
