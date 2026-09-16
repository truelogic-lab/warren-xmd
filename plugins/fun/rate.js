import { resolveTarget, num } from '../group/_helpers.js';

export default {
  name: "Rate",
  triggers: ["rate"],
  category: "fun",
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args) || ctx.sender;
    const percent = Math.floor(Math.random() * 101);
    const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
    await ctx.sock.sendMessage(ctx.from, {
      text: `⭐ *Rating for @${num(target)}*\n\n[${bar}] ${percent}/100`,
      mentions: [target]
    }, { quoted: ctx.m });
  }
};
