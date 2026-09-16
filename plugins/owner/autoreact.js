import { cache } from '../../lib/cache.js';

export default {
  name: "AutoReact",
  triggers: ["autoreact"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    const current = cache.get('autoreact') || false;
    if (sub === 'on') {
      cache.set('autoreact', true, 86400000 * 365);
      return ctx.reply("✅ AutoReact ENABLED — bot reacts to every message");
    }
    if (sub === 'off') {
      cache.set('autoreact', false, 86400000 * 365);
      return ctx.reply("❌ AutoReact DISABLED");
    }
    await ctx.reply(`📖 *AutoReact*\n\n.autoreact on\n.autoreact off\n\nStatus: ${current ? '✅ ON' : '❌ OFF'}`);
  }
};
