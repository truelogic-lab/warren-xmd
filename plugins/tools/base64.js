export default {
  name: "Base64",
  triggers: ["base64", "b64encode"],
  category: "tools",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Usage: ${ctx.settings.prefix}base64 <text>`);
    const encoded = Buffer.from(ctx.text).toString('base64');
    await ctx.reply(`🔐 *Encoded:*\n\`\`\`${encoded}\`\`\``);
  }
};
