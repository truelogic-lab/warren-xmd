import { getSettings, invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "AntiBot",
  triggers: ["antibot"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on') {
      await updateGroupSetting(ctx.from, 'antibot', true);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ AntiBot ENABLED");
    }
    if (sub === 'off') {
      await updateGroupSetting(ctx.from, 'antibot', false);
      invalidateSettings(ctx.from);
      return ctx.reply("❌ AntiBot DISABLED");
    }
    const cur = await getSettings(ctx.from);
    await ctx.reply(`📖 *AntiBot*\n\n.antibot on\n.antibot off\n\nStatus: ${cur.antibot ? '✅ ON' : '❌ OFF'}`);
  }
};
