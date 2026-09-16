import { getSettings, invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "AntiDelete",
  triggers: ["antidelete"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on') {
      await updateGroupSetting(ctx.from, 'antidelete', true);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ AntiDelete ENABLED — deleted messages will be reshown");
    }
    if (sub === 'off') {
      await updateGroupSetting(ctx.from, 'antidelete', false);
      invalidateSettings(ctx.from);
      return ctx.reply("❌ AntiDelete DISABLED");
    }
    const cur = await getSettings(ctx.from);
    await ctx.reply(`📖 *AntiDelete*\n\n.antidelete on\n.antidelete off\n\nStatus: ${cur.antidelete ? '✅ ON' : '❌ OFF'}`);
  }
};
