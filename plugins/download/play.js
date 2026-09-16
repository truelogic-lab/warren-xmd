import { ytdl } from 'ytdl-plus';
import fs from 'fs-extra';

export default {
  name: "Play",
  triggers: ["play", "ytmp3", "song"],
  category: "download",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Provide a song name or YouTube link.\nExample: ${ctx.settings.prefix}play Imagine Dragons Believer`);
    try {
      await ctx.reply("⏳ Searching...");
      let url = ctx.text;
      if (!url.startsWith('http')) {
        const results = await ytdl.search(ctx.text, { limit: 1 });
        if (!results.length) return ctx.reply("❌ No results found.");
        url = results[0].url;
      }

      await ctx.reply("⏳ Downloading audio...");
      const result = await ytdl.downloadAudio(url, {
        format: 'm4a',
        quality: 'highestaudio',
        outputDir: './tmp',
      });

      const buffer = await fs.readFile(result.filePath);
      await ctx.sock.sendMessage(ctx.from, {
        audio: buffer,
        mimetype: 'audio/mp4',
        ptt: false,
      }, { quoted: ctx.m });

      await fs.unlink(result.filePath).catch(() => {});
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
