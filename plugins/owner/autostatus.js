import { cache } from '../../lib/cache.js';

export default {
  name: "AutoStatusView",
  triggers: ["autostatus", "autoviewstatus"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    const current = cache.get('autostatus') || false;
    if (sub === 'on') {
      cache.set('autostatus', true, 86400000 * 365);
      return ctx.reply("✅ AutoStatusView ENABLED — all statuses auto-viewed");
    }
    if (sub === 'off') {
      cache.set('autostatus', false, 86400000 * 365);
      return ctx.reply("❌ AutoStatusView DISABLED");
    }
    await ctx.reply(`📖 *AutoStatusView*\n\n.autostatus on\n.autostatus off\n\nStatus: ${current ? '✅ ON' : '❌ OFF'}`);
  }
};
