import { getMeta, num } from './_helpers.js';

export default {
  name: "ListMembers",
  triggers: ["listmembers", "members", "participants"],
  category: "group",
  group: true,
  code: async (ctx) => {
    const meta = await getMeta(ctx.sock, ctx.from);
    const members = meta.participants;
    const mentions = members.map(m => m.id);
    let msg = `👥 *Group Members (${members.length})*\n\n`;
    members.forEach((m, i) => {
      const tag = m.admin ? '👑' : '•';
      msg += `${i + 1}. ${tag} @${num(m.id)}\n`;
    });
    // WhatsApp text limit ~65k, so cap at 200 members
    if (members.length > 200) {
      msg = msg.split('\n').slice(0, 210).join('\n') + `\n\n...and ${members.length - 200} more`;
    }
    await ctx.sock.sendMessage(ctx.from, { text: msg, mentions }, { quoted: ctx.m });
  }
};
