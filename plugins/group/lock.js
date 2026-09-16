import { getSettings, invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "Lock",
  triggers: ["lock", "lockgc"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      await ctx.sock.groupSettingUpdate(ctx.from, 'locked');
      await updateGroupSetting(ctx.from, 'locked', true);
      invalidateSettings(ctx.from);
      await ctx.reply("🔒 Group info locked — only admins can edit.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
