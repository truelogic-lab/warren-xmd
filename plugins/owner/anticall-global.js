import { getGroupSettings, updateGroupSetting } from '../../lib/database.js';
import { invalidateSettings } from '../group/_helpers.js';

export default {
  name: "AntiCallGlobal",
  triggers: ["anticallglobal", "globalanticall"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on') {
      await updateGroupSetting('global', 'anticall', true);
      invalidateSettings('global');
      return ctx.reply("✅ Global AntiCall ENABLED — all incoming calls rejected.");
    }
    if (sub === 'off') {
      await updateGroupSetting('global', 'anticall', false);
      invalidateSettings('global');
      return ctx.reply("❌ Global AntiCall DISABLED.");
    }
    const cur = await getGroupSettings('global');
    await ctx.reply(`📖 *Global AntiCall*\n\n.anticallglobal on\n.anticallglobal off\n\nStatus: ${cur.anticall ? '✅ ON' : '❌ OFF'}`);
  }
};
