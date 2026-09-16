import axios from 'axios';
import { resolveTarget, num } from '../group/_helpers.js';

export default {
  name: "HighFive",
  triggers: ["highfive", "hf"],
  category: "fun",
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Mention someone.");
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/highfive');
      const gif = data.results[0];
      await ctx.sock.sendMessage(ctx.from, {
        video: { url: gif.url },
        gifPlayback: true,
        caption: `🙌 @${num(ctx.sender)} high-fived @${num(target)}!`,
        mentions: [ctx.sender, target]
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
