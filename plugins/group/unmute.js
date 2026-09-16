import { invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "Unmute",
  triggers: ["unmute", "open"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      await ctx.sock.groupSettingUpdate(ctx.from, 'not_announcement');
      await updateGroupSetting(ctx.from, 'mute', false);
      invalidateSettings(ctx.from);
      await ctx.reply("🔊 Group unmuted — everyone can send messages.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
