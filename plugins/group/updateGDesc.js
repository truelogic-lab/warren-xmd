export default {
  name: "UpdateGroupDesc",
  triggers: ["updateGDesc", "setgdesc", "setgcdesc"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Provide a new description.");
    try {
      await ctx.sock.groupUpdateDescription(ctx.from, ctx.text);
      await ctx.reply("✅ Description updated.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
