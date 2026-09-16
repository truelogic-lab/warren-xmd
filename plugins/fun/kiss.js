import axios from 'axios';
import { resolveTarget, num } from '../group/_helpers.js';

export default {
  name: "Kiss",
  triggers: ["kiss", "kiss2"],
  category: "fun",
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Mention someone to kiss.");
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/kiss');
      const gif = data.results[0];
      await ctx.sock.sendMessage(ctx.from, {
        video: { url: gif.url },
        gifPlayback: true,
        caption: `😘 @${num(ctx.sender)} kissed @${num(target)}!`,
        mentions: [ctx.sender, target]
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.sock.sendMessage(ctx.from, {
        text: `😘 @${num(ctx.sender)} kissed @${num(target)}!`,
        mentions: [ctx.sender, target]
      }, { quoted: ctx.m });
    }
  }
};
