export default {
  name: "Join",
  triggers: ["join", "joingc"],
  category: "group",
  group: true,
  code: async (ctx) => {
    const link = ctx.args[0];
    if (!link || !link.includes('chat.whatsapp.com/')) {
      return ctx.reply(`❌ Provide an invite link.\nExample: ${ctx.settings.prefix}join https://chat.whatsapp.com/XXXXX`);
    }
    const code = link.split('chat.whatsapp.com/')[1].split(/[\s?]/)[0];
    try {
      const jid = await ctx.sock.groupAcceptInvite(code);
      await ctx.reply(`✅ Joined group: ${jid}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
