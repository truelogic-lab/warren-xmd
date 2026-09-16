import { download } from '@silent-tech-offc/ttdl';

export default {
  name: "TikTokPhoto",
  triggers: ["tiktokphoto", "ttphoto"],
  category: "download",
  code: async (ctx) => {
    const url = ctx.text;
    if (!url || !url.includes('tiktok.com')) {
      return ctx.reply(`❌ Provide a TikTok link.`);
    }
    try {
      await ctx.reply("⏳ Downloading...");
      const v = await download(url);
      // TikTok photo slides — the API may expose 'images'
      const images = v.images || v.photos || [];
      if (!images.length) return ctx.reply("❌ No photos found in this link.");
      for (const img of images) {
        await ctx.sock.sendMessage(ctx.from, {
          image: { url: typeof img === 'string' ? img : img.url }
        }, { quoted: ctx.m });
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
