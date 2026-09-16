import axios from 'axios';
import { resolveTarget, num } from '../group/_helpers.js';

export default {
  name: "Bonk",
  triggers: ["bonk"],
  category: "fun",
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args) || ctx.sender;
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/bonk');
      const gif = data.results[0];
      await ctx.sock.sendMessage(ctx.from, {
        video: { url: gif.url },
        gifPlayback: true,
        caption: `🔨 @${num(target)} got bonked!`,
        mentions: [target]
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
