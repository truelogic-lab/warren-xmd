import { cache } from '../../lib/cache.js';

export default {
  name: "AutoRead",
  triggers: ["autoread"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    const current = cache.get('autoread') || false;
    if (sub === 'on') {
      cache.set('autoread', true, 86400000 * 365);
      return ctx.reply("✅ AutoRead ENABLED");
    }
    if (sub === 'off') {
      cache.set('autoread', false, 86400000 * 365);
      return ctx.reply("❌ AutoRead DISABLED");
    }
    await ctx.reply(`📖 *AutoRead*\n\n.autoread on\n.autoread off\n\nStatus: ${current ? '✅ ON' : '❌ OFF'}`);
  }
};
