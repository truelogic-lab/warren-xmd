export default {
  name: "Poll",
  triggers: ["poll", "vote"],
  category: "group",
  group: true,
  code: async (ctx) => {
    // Usage: .poll Question | Option1 | Option2 | Option3
    const input = ctx.text;
    if (!input || !input.includes('|')) {
      return ctx.reply(`❌ Usage: ${ctx.settings.prefix}poll Question | Option1 | Option2 | ...`);
    }
    const parts = input.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) {
      return ctx.reply("❌ Need a question and at least 2 options.");
    }
    const [question, ...options] = parts;
    try {
      await ctx.sock.sendMessage(ctx.from, {
        poll: {
          name: question,
          values: options,
          selectableCount: 1,
        }
      });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
