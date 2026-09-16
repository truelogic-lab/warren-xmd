import { invalidateGroup } from './_helpers.js';

export default {
  name: "SetGroupDesc",
  triggers: ["setdesc", "setgdesc", "setgcdesc", "updateGDesc"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Provide a new description.\nExample: ${ctx.settings.prefix}setdesc Welcome to our group!`);
    try {
      await ctx.sock.groupUpdateDescription(ctx.from, ctx.text);
      invalidateGroup(ctx.from);
      await ctx.reply("✅ Description updated.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
