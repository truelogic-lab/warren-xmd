import CobaltAPI from 'cobalt-api';

export default {
  name: "Facebook",
  triggers: ["facebook", "fb"],
  category: "download",
  code: async (ctx) => {
    const url = ctx.text;
    if (!url || !url.includes('facebook.com')) {
      return ctx.reply(`❌ Provide a Facebook video link.`);
    }
    try {
      await ctx.reply("⏳ Downloading...");
      const cobalt = new CobaltAPI(url);
      cobalt.setQuality('max');
      const response = await cobalt.sendRequest();

      if (response.status !== 'success') {
        return ctx.reply(`❌ Failed: ${response.text || 'Unknown error'}`);
      }

      const mediaUrl = response.data?.url;
      await ctx.sock.sendMessage(ctx.from, {
        video: { url: mediaUrl },
        caption: '📥 Facebook video'
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
