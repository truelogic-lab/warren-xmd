export default {
  name: "UpdateGroupName",
  triggers: ["updateGName", "setgname", "setgcname"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Provide a new group name.");
    try {
      await ctx.sock.groupUpdateSubject(ctx.from, ctx.text);
      await ctx.reply(`✅ Group name updated to: ${ctx.text}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
