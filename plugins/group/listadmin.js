import { getMeta, num } from './_helpers.js';

export default {
  name: "ListAdmins",
  triggers: ["listadmin", "admins"],
  category: "group",
  group: true,
  code: async (ctx) => {
    const meta = await getMeta(ctx.sock, ctx.from);
    const admins = meta.participants.filter(p => p.admin);
    const mentions = admins.map(a => a.id);
    let msg = `👑 *Group Admins (${admins.length})*\n\n`;
    admins.forEach((a, i) => {
      const tag = a.admin === 'superadmin' ? '👑' : '⭐';
      msg += `${i + 1}. ${tag} @${num(a.id)}\n`;
    });
    await ctx.sock.sendMessage(ctx.from, { text: msg, mentions }, { quoted: ctx.m });
  }
};
