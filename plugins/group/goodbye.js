import { getSettings, invalidateSettings } from './_helpers.js';
import { updateGroupSetting } from '../../lib/database.js';

export default {
  name: "Goodbye",
  triggers: ["goodbye"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    const current = await getSettings(ctx.from);

    if (sub === 'on') {
      await updateGroupSetting(ctx.from, 'goodbye', true);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ Goodbye messages ENABLED");
    }
    if (sub === 'off') {
      await updateGroupSetting(ctx.from, 'goodbye', false);
      invalidateSettings(ctx.from);
      return ctx.reply("❌ Goodbye messages DISABLED");
    }
    if (sub === 'set') {
      const msg = ctx.text.slice(3).trim();
      if (!msg) return ctx.reply("❌ Provide the message.\nExample: .goodbye set Bye @user!");
      await updateGroupSetting(ctx.from, 'goodbye_msg', msg);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ Custom goodbye message saved.\n\nPlaceholders: @user, @group");
    }
    if (sub === 'reset') {
      await updateGroupSetting(ctx.from, 'goodbye_msg', null);
      invalidateSettings(ctx.from);
      return ctx.reply("✅ Goodbye message reset.");
    }

    await ctx.reply(`📖 *Goodbye setup*\n\n.goodbye on — enable\n.goodbye off — disable\n.goodbye set <message> — custom\n.goodbye reset — reset\n\nStatus: ${current.goodbye ? '✅ ON' : '❌ OFF'}`);
  }
};
