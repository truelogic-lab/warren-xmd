import { getMeta, num } from './_helpers.js';
import { fancy } from '../../lib/fancy.js';

export default {
  name: "GroupInfo",
  triggers: ["ginfo", "groupinfo", "infogc"],
  category: "group",
  group: true,
  code: async (ctx) => {
    try {
      const meta = await getMeta(ctx.sock, ctx.from);
      const admins = meta.participants.filter(p => p.admin).map(p => p.id);
      const created = new Date(meta.creation * 1000).toDateString();

      let info = `━━━━━『 ${fancy('group info')} 』━━━━━\n\n`;
      info += `📛 *Name:* ${meta.subject}\n`;
      info += `🆔 *ID:* ${meta.id}\n`;
      info += `👥 *Members:* ${meta.participants.length}\n`;
      info += `👑 *Admins:* ${admins.length}\n`;
      info += `📅 *Created:* ${created}\n`;
      info += `🔒 *Locked:* ${meta.announce ? 'Yes (announcement)' : 'No'}\n`;
      if (meta.desc) info += `\n📝 *Description:*\n${meta.desc.slice(0, 500)}`;

      await ctx.sock.sendMessage(ctx.from, {
        text: info,
        mentions: admins,
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
