import { getGroupSettings } from '../../lib/database.js';
import { fancy } from '../../lib/fancy.js';

export default {
  name: "GroupSettings",
  triggers: ["settings", "toggles"],
  category: "group",
  group: true,
  code: async (ctx) => {
    try {
      const s = await getGroupSettings(ctx.from);
      const on = (v) => v ? '✅ ON' : '❌ OFF';
      let msg = `━━━━━『 ${fancy('group settings')} 』━━━━━\n\n`;
      msg += `🔗 AntiLink: ${on(s.antilink)}\n`;
      msg += `🤖 AntiBot: ${on(s.antibot)}\n`;
      msg += `🚫 AntiSpam: ${on(s.antispam)}\n`;
      msg += `🗑️ AntiDelete: ${on(s.antidelete)}\n`;
      msg += `📵 AntiCall: ${on(s.anticall)}\n`;
      msg += `👋 Welcome: ${on(s.welcome)}\n`;
      msg += `👋 Goodbye: ${on(s.goodbye)}\n`;
      msg += `🔇 Muted: ${on(s.mute)}\n`;
      msg += `🔒 Locked: ${on(s.locked)}\n`;
      if (s.welcome_msg) msg += `\n📝 Welcome msg: ${s.welcome_msg}`;
      if (s.goodbye_msg) msg += `\n📝 Goodbye msg: ${s.goodbye_msg}`;
      await ctx.reply(msg);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
