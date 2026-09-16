import axios from 'axios';
import { resolveTarget, num } from '../group/_helpers.js';

export default {
  name: "Hug",
  triggers: ["hug"],
  category: "fun",
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Mention someone to hug.");
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/hug');
      const gif = data.results[0];
      await ctx.sock.sendMessage(ctx.from, {
        video: { url: gif.url },
        gifPlayback: true,
        caption: `🤗 @${num(ctx.sender)} hugged @${num(target)}!`,
        mentions: [ctx.sender, target]
      }, { quoted: ctx.m });
    } catch (e) {
      // Fallback: text only
      await ctx.sock.sendMessage(ctx.from, {
        text: `🤗 @${num(ctx.sender)} hugged @${num(target)}!`,
        mentions: [ctx.sender, target]
      }, { quoted: ctx.m });
    }
  }
};
