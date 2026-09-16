export default {
  name: "Invite",
  triggers: ["invite"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const number = ctx.args[0]?.replace(/\D/g, '');
    if (!number || number.length < 10) return ctx.reply("❌ Provide a number.");
    try {
      const code = await ctx.sock.groupInviteCode(ctx.from);
      const link = `https://chat.whatsapp.com/${code}`;
      // Send the invite link to the number directly
      await ctx.sock.sendMessage(`${number}@s.whatsapp.net`, {
        text: `You've been invited to *${(await ctx.sock.groupMetadata(ctx.from)).subject}*\n${link}`
      });
      await ctx.reply(`✅ Invite sent to ${number}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
