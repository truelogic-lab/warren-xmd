export default {
  name: "URLEncode",
  triggers: ["urlencode", "url"],
  category: "tools",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Usage: ${ctx.settings.prefix}urlencode <text>`);
    await ctx.reply(`🔗 \`${encodeURIComponent(ctx.text)}\``);
  }
};
