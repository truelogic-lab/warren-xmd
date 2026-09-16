import axios from 'axios';
import { num } from '../group/_helpers.js';

export default {
  name: "Wave",
  triggers: ["wave"],
  category: "fun",
  code: async (ctx) => {
    try {
      const { data } = await axios.get('https://nekos.best/api/v2/wave');
      const gif = data.results[0];
      await ctx.sock.sendMessage(ctx.from, {
        video: { url: gif.url },
        gifPlayback: true,
        caption: `👋 @${num(ctx.sender)} waves!`,
        mentions: [ctx.sender]
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
