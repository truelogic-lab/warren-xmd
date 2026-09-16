export default {
  name: "Eval",
  triggers: ["eval", "exec", ">"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Provide JS code.");
    try {
      let result = eval(ctx.text);
      if (result instanceof Promise) result = await result;
      const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
      await ctx.reply(`✅ Result:\n\`\`\`${output.slice(0, 3500)}\`\`\``);
    } catch (e) {
      await ctx.reply(`❌ Error: ${e.message}`);
    }
  }
};
