import { ytdl } from 'ytdl-plus';
import fs from 'fs-extra';

export default {
  name: "Video",
  triggers: ["video", "ytmp4", "yt"],
  category: "download",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Provide a YouTube link.\nExample: ${ctx.settings.prefix}video https://youtu.be/xxx`);
    try {
      await ctx.reply("⏳ Downloading video...");
      const result = await ytdl.download(ctx.text, {
        quality: 'highest',
        format: 'mp4',
        outputDir: './tmp',
      });

      const buffer = await fs.readFile(result.filePath);
      await ctx.sock.sendMessage(ctx.from, {
        video: buffer,
        mimetype: 'video/mp4',
        caption: '📥 Downloaded from YouTube'
      }, { quoted: ctx.m });

      await fs.unlink(result.filePath).catch(() => {});
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
