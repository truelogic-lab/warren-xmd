import { listSessions, sessionCount } from '../../lib/session-manager.js';

export default {
  name: "Sessions",
  triggers: ["sessions", "listsessions"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const list = listSessions();
    if (!list.length) return ctx.reply("❌ No active sessions.");
    let msg = `📱 *Active Sessions (${sessionCount()})*\n\n`;
    msg += list.map((s, i) => `${i + 1}. ${s}`).join('\n');
    await ctx.reply(msg);
  }
};
