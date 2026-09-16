import { getSettings, invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "Mute",
  triggers: ["mute", "close"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      await ctx.sock.groupSettingUpdate(ctx.from, 'announcement');
      await updateGroupSetting(ctx.from, 'mute', true);
      invalidateSettings(ctx.from);
      await ctx.reply("🔇 Group muted — only admins can send messages.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
