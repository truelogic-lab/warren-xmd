export default {
  name: "Revoke",
  triggers: ["revoke", "resetlink"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      await ctx.sock.groupRevokeInvite(ctx.from);
      const code = await ctx.sock.groupInviteCode(ctx.from);
      await ctx.reply(`✅ Link reset.\n🔗 https://chat.whatsapp.com/${code}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
