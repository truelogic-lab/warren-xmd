import { num } from '../group/_helpers.js';

export default {
  name: "BlockList",
  triggers: ["blocklist", "listblock"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    try {
      const list = await ctx.sock.fetchBlocklist();
      if (!list.length) return ctx.reply("✅ No blocked contacts.");
      let msg = `🚫 *Blocked Contacts (${list.length})*\n\n`;
      msg += list.map((j, i) => `${i + 1}. @${num(j)}`).join('\n');
      await ctx.sock.sendMessage(ctx.from, { text: msg, mentions: list }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
