export default {
  name: "RejectAll",
  triggers: ["rejectall", "denyall"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      const requests = await ctx.sock.groupRequestParticipantsList(ctx.from);
      if (!requests.length) return ctx.reply("✅ No pending requests.");
      const jids = requests.map(r => r.jid);
      await ctx.sock.groupRequestParticipantsUpdate(ctx.from, jids, 'reject');
      await ctx.reply(`✅ Rejected ${jids.length} request(s).`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
