export default {
  name: "URLDecode",
  triggers: ["urldecode", "unurl"],
  category: "tools",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Usage: ${ctx.settings.prefix}urldecode <url>`);
    try {
      await ctx.reply(`🔗 \`${decodeURIComponent(ctx.text)}\``);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
