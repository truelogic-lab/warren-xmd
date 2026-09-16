import { download } from '@silent-tech-offc/ttdl';

export default {
  name: "TikTok",
  triggers: ["tiktok", "tt"],
  category: "download",
  code: async (ctx) => {
    const url = ctx.text || ctx.m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
    if (!url || !url.includes('tiktok.com')) {
      return ctx.reply(`❌ Provide a TikTok link.\nExample: ${ctx.settings.prefix}tiktok https://vt.tiktok.com/xxx`);
    }
    try {
      await ctx.reply("⏳ Downloading...");
      const v = await download(url);
      await ctx.sock.sendMessage(ctx.from, {
        video: { url: v.videoNoWatermark || v.video },
        caption: `🎵 *${v.title || 'TikTok Video'}*\n👤 ${v.author || ''}`
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
