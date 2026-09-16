export default {
  name: "AcceptAll",
  triggers: ["acceptall", "approveall"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      const requests = await ctx.sock.groupRequestParticipantsList(ctx.from);
      if (!requests.length) return ctx.reply("✅ No pending requests.");
      const jids = requests.map(r => r.jid);
      await ctx.sock.groupRequestParticipantsUpdate(ctx.from, jids, 'approve');
      await ctx.reply(`✅ Accepted ${jids.length} request(s).`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
