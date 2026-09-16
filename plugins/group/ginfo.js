import { fancy } from '../../lib/fancy.js';

export default {
  name: "GroupInfo",
  triggers: ["ginfo", "groupinfo"],
  category: "group",
  group: true,
  code: async (ctx) => {
    const { sock, from } = ctx;
    try {
      const meta = await sock.groupMetadata(from);
      const admins = meta.participants.filter(p => p.admin).map(p => p.id.split('@')[0]);
      let info = `━━━━━『 ${fancy('group info')} 』━━━━━\n\n`;
      info += `📛 *Name:* ${meta.subject}\n`;
      info += `🆔 *ID:* ${meta.id}\n`;
      info += `👥 *Members:* ${meta.participants.length}\n`;
      info += `👑 *Admins:* ${admins.length}\n`;
      info += `📅 *Created:* ${new Date(meta.creation * 1000).toDateString()}\n`;
      if (meta.desc) info += `📝 *Desc:* ${meta.desc.slice(0, 200)}\n`;
      await ctx.reply(info);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
