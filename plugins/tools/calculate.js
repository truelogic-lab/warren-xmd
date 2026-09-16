import { create, all } from 'mathjs';

const math = create(all, {});

export default {
  name: "Calculate",
  triggers: ["calc", "calculate", "math"],
  category: "tools",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Usage: ${ctx.settings.prefix}calc 5 * (3 + 2)`);
    try {
      const result = math.evaluate(ctx.text);
      await ctx.reply(`🧮 *${ctx.text}* = *${result}*`);
    } catch (e) {
      await ctx.reply(`❌ Invalid expression: ${e.message}`);
    }
  }
};
