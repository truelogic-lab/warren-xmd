import axios from 'axios';

export default {
  name: "Shorten",
  triggers: ["shorten", "tinyurl"],
  category: "tools",
  code: async (ctx) => {
    if (!ctx.text || !ctx.text.startsWith('http')) {
      return ctx.reply(`❌ Provide a URL.\nExample: ${ctx.settings.prefix}shorten https://example.com/long-url`);
    }
    try {
      const { data } = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(ctx.text)}`);
      await ctx.reply(`🔗 Short URL:\n${data}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
