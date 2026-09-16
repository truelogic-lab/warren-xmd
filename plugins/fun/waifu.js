import axios from 'axios';

export default {
  name: "Waifu",
  triggers: ["waifu", "neko", "kitsune", "animegirl"],
  category: "fun",
  code: async (ctx) => {
    try {
      const cmd = ctx.command;
      const map = {
        waifu: 'waifu',
        neko: 'neko',
        kitsune: 'kitsune',
        animegirl: 'waifu'
      };
      const type = map[cmd] || 'waifu';
      const { data } = await axios.get(`https://nekos.best/api/v2/${type}`);
      const result = data.results[0];
      await ctx.sock.sendMessage(ctx.from, {
        image: { url: result.url },
        caption: `✨ *${result.artist_name || 'Unknown artist'}*`
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
