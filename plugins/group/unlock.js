import { invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "Unlock",
  triggers: ["unlock", "unlockgc"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      await ctx.sock.groupSettingUpdate(ctx.from, 'unlocked');
      await updateGroupSetting(ctx.from, 'locked', false);
      invalidateSettings(ctx.from);
      await ctx.reply("🔓 Group info unlocked.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
