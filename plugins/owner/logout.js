import { removeSession } from '../../lib/session-manager.js';

export default {
  name: "Logout",
  triggers: ["logout", "disconnect"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const phone = ctx.args[0]?.replace(/\D/g, '') || ctx.botNumber;
    try {
      const ok = await removeSession(phone);
      await ctx.reply(ok ? `✅ Logged out ${phone}` : `❌ No active session for ${phone}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
