import { getMeta, num } from './_helpers.js';

export default {
  name: "Everyone",
  triggers: ["all", "here"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const meta = await getMeta(ctx.sock, ctx.from);
    const mentions = meta.participants.map(p => p.id);
    const names = mentions.map(id => `@${num(id)}`).join(' ');
    await ctx.sock.sendMessage(ctx.from, {
      text: `📣 ${ctx.text || 'Attention!'}\n\n${names}`,
      mentions
    }, { quoted: ctx.m });
  }
};
