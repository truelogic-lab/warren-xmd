import CobaltAPI from 'cobalt-api';

export default {
  name: "Instagram",
  triggers: ["instagram", "ig"],
  category: "download",
  code: async (ctx) => {
    const url = ctx.text;
    if (!url || !url.includes('instagram.com')) {
      return ctx.reply(`❌ Provide an Instagram link.`);
    }
    try {
      await ctx.reply("⏳ Downloading...");
      const cobalt = new CobaltAPI(url);
      cobalt.setQuality('max');
      const response = await cobalt.sendRequest();

      if (response.status !== 'success') {
        return ctx.reply(`❌ Failed: ${response.text || 'Unknown error'}`);
      }

      const mediaUrl = response.data?.url || response.data?.picker?.[0]?.url;
      if (!mediaUrl) return ctx.reply("❌ No media found.");

      if (mediaUrl.includes('.mp4')) {
        await ctx.sock.sendMessage(ctx.from, { video: { url: mediaUrl } }, { quoted: ctx.m });
      } else {
        await ctx.sock.sendMessage(ctx.from, { image: { url: mediaUrl } }, { quoted: ctx.m });
      }
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
