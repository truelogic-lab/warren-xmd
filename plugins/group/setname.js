import { invalidateGroup } from './_helpers.js';

export default {
  name: "SetGroupName",
  triggers: ["setname", "setgname", "setgcname", "updateGName"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Provide a new name.\nExample: ${ctx.settings.prefix}setname Cool Group`);
    try {
      await ctx.sock.groupUpdateSubject(ctx.from, ctx.text);
      invalidateGroup(ctx.from);
      await ctx.reply(`✅ Group name updated to: *${ctx.text}*`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
