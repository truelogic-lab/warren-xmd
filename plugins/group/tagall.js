import { getMeta, num } from './_helpers.js';

export default {
  name: "TagAll",
  triggers: ["tagall", "everyone"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      const meta = await getMeta(ctx.sock, ctx.from);
      const members = meta.participants.map(p => p.id);
      let msg = ctx.text ? `📢 *${ctx.text}*\n\n` : `📢 *Attention wanguana!*\n\n`;
      msg += members.map((id, i) => `${i + 1}. @${num(id)}`).join('\n');
      msg += `\n\n_Total: ${members.length} members_`;
      await ctx.sock.sendMessage(ctx.from, { text: msg, mentions: members }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
