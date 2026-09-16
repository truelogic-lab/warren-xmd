import { cache } from '../../lib/cache.js';

export default {
  name: "AutoTyping",
  triggers: ["autotyping"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    const current = cache.get('autotyping') || false;
    if (sub === 'on') {
      cache.set('autotyping', true, 86400000 * 365);
      return ctx.reply("✅ AutoTyping ENABLED — bot shows 'typing...' before replies");
    }
    if (sub === 'off') {
      cache.set('autotyping', false, 86400000 * 365);
      return ctx.reply("❌ AutoTyping DISABLED");
    }
    await ctx.reply(`📖 *AutoTyping*\n\n.autotyping on\n.autotyping off\n\nStatus: ${current ? '✅ ON' : '❌ OFF'}`);
  }
};
