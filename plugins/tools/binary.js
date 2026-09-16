export default {
  name: "Binary",
  triggers: ["binary", "tobinary"],
  category: "tools",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Usage: ${ctx.settings.prefix}binary <text>`);
    const bin = ctx.text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    await ctx.reply(`💻 *Binary:*\n\`\`\`${bin}\`\`\``);
  }
};
