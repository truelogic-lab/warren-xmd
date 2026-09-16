import axios from 'axios';

export default {
  name: "Pinterest",
  triggers: ["pinterest", "pin"],
  category: "download",
  code: async (ctx) => {
    const url = ctx.text;
    if (!url || !url.includes('pinterest.')) {
      return ctx.reply(`❌ Provide a Pinterest link.`);
    }
    try {
      await ctx.reply("⏳ Downloading...");
      // Convert pin page to direct image URL
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const match = data.match(/https:\/\/i\.pinimg\.com\/originals\/[^"]+\.(jpg|png|gif)/);
      if (!match) return ctx.reply("❌ Could not find image.");
      await ctx.sock.sendMessage(ctx.from, {
        image: { url: match[0] },
        caption: '📥 From Pinterest'
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
