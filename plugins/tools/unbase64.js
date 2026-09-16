export default {
  name: "UnBase64",
  triggers: ["unbase64", "b64decode"],
  category: "tools",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Usage: ${ctx.settings.prefix}unbase64 <base64>`);
    try {
      const decoded = Buffer.from(ctx.text, 'base64').toString('utf8');
      await ctx.reply(`🔓 *Decoded:*\n\`\`\`${decoded}\`\`\``);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
