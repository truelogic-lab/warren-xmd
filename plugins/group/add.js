import { invalidateGroup, num } from './_helpers.js';

export default {
  name: "Add",
  triggers: ["add"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const number = ctx.args[0]?.replace(/\D/g, '');
    if (!number || number.length < 10) {
      return ctx.reply(`❌ Provide a number.\nExample: ${ctx.settings.prefix}add 254712345678`);
    }
    const jid = `${number}@s.whatsapp.net`;
    try {
      const res = await ctx.sock.groupParticipantsUpdate(ctx.from, [jid], "add");
      invalidateGroup(ctx.from);
      const status = res?.[0]?.status;
      if (status === '403') return ctx.reply(`❌ @${number} has privacy settings blocking add.`);
      if (status === '408') return ctx.reply(`❌ @${number} left recently. Cannot re-add yet.`);
      if (status === '409') return ctx.reply(`❌ @${number} is already in the group.`);
      await ctx.reply(`✅ Added @${number}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
