import { getSettings, invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "AntiSpam",
  triggers: ["antispam"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on') {
      await updateGroupSetting(ctx.from, 'antispam', true);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ AntiSpam ENABLED — messages >5 in 3s will be removed");
    }
    if (sub === 'off') {
      await updateGroupSetting(ctx.from, 'antispam', false);
      invalidateSettings(ctx.from);
      return ctx.reply("❌ AntiSpam DISABLED");
    }
    const cur = await getSettings(ctx.from);
    await ctx.reply(`📖 *AntiSpam*\n\n.antispam on\n.antispam off\n\nStatus: ${cur.antispam ? '✅ ON' : '❌ OFF'}`);
  }
};
