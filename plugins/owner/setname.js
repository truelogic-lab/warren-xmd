export default {
  name: "SetBotName",
  triggers: ["setbotname", "setmyname"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Provide a name.");
    try {
      await ctx.sock.updateProfileName(ctx.text);
      await ctx.reply(`✅ Bot name set to: ${ctx.text}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
