import { getSettings, invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "AntiCall",
  triggers: ["anticall"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on') {
      await updateGroupSetting(ctx.from, 'anticall', true);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ AntiCall ENABLED — incoming calls will be rejected");
    }
    if (sub === 'off') {
      await updateGroupSetting(ctx.from, 'anticall', false);
      invalidateSettings(ctx.from);
      return ctx.reply("❌ AntiCall DISABLED");
    }
    const cur = await getSettings(ctx.from);
    await ctx.reply(`📖 *AntiCall*\n\n.anticall on\n.anticall off\n\nStatus: ${cur.anticall ? '✅ ON' : '❌ OFF'}`);
  }
};
