import axios from 'axios';

export default {
  name: "Lyrics",
  triggers: ["lyrics", "lyric"],
  category: "download",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Provide a song name.\nExample: ${ctx.settings.prefix}lyrics Believer`);
    try {
      const { data } = await axios.get(`https://api.lyrics.ovh/suggest/${encodeURIComponent(ctx.text)}`);
      if (!data.data?.length) return ctx.reply("❌ No song found.");
      const top = data.data[0];
      const { data: lyrics } = await axios.get(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(top.artist.name)}/${encodeURIComponent(top.title)}`
      );
      await ctx.reply(`🎵 *${top.title}* — ${top.artist.name}\n\n${lyrics.lyrics.slice(0, 4000)}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
