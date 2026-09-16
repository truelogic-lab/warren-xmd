import { getSettings, invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "AntiLink",
  triggers: ["antilink"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on') {
      await updateGroupSetting(ctx.from, 'antilink', true);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ AntiLink ENABLED — links will be deleted");
    }
    if (sub === 'off') {
      await updateGroupSetting(ctx.from, 'antilink', false);
      invalidateSettings(ctx.from);
      return ctx.reply("❌ AntiLink DISABLED");
    }
    const cur = await getSettings(ctx.from);
    await ctx.reply(`📖 *AntiLink*\n\n.antilink on — enable\n.antilink off — disable\n\nStatus: ${cur.antilink ? '✅ ON' : '❌ OFF'}\n\nNon-admins posting links will be warned and removed.`);
  }
};
