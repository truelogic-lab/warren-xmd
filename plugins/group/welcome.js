import { getSettings, invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "Welcome",
  triggers: ["welcome"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    const current = await getSettings(ctx.from);

    if (sub === 'on') {
      await updateGroupSetting(ctx.from, 'welcome', true);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ Welcome messages ENABLED");
    }
    if (sub === 'off') {
      await updateGroupSetting(ctx.from, 'welcome', false);
      invalidateSettings(ctx.from);
      return ctx.reply("❌ Welcome messages DISABLED");
    }
    if (sub === 'set') {
      const msg = ctx.text.slice(3).trim();
      if (!msg) return ctx.reply("❌ Provide the message.\nExample: .welcome set Hello @user, welcome to @group!");
      await updateGroupSetting(ctx.from, 'welcome_msg', msg);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ Custom welcome message saved.\n\nPlaceholders: @user, @group, @count");
    }
    if (sub === 'reset') {
      await updateGroupSetting(ctx.from, 'welcome_msg', null);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ Welcome message reset to default.");
    }

    await ctx.reply(`📖 *Welcome setup*\n\n.welcome on — enable\n.welcome off — disable\n.welcome set <message> — custom\n.welcome reset — reset message\n\nStatus: ${current.welcome ? '✅ ON' : '❌ OFF'}\nMessage: ${current.welcome_msg || '(default)'}`);
  }
};
