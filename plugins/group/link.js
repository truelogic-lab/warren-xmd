export default {
  name: "GroupLink",
  triggers: ["link", "gclink", "invitelink"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      const code = await ctx.sock.groupInviteCode(ctx.from);
      await ctx.reply(`🔗 https://chat.whatsapp.com/${code}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
