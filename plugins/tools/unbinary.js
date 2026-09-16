export default {
  name: "UnBinary",
  triggers: ["unbinary", "frombinary"],
  category: "tools",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Usage: ${ctx.settings.prefix}unbinary <binary>`);
    try {
      const text = ctx.text.split(' ').map(b => String.fromCharCode(parseInt(b, 2))).join('');
      await ctx.reply(`💬 *Text:*\n\`\`\`${text}\`\`\``);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
