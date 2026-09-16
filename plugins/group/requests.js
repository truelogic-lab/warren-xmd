import { num } from './_helpers.js';

export default {
  name: "JoinRequests",
  triggers: ["requests", "pending", "joinrequests"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    try {
      const requests = await ctx.sock.groupRequestParticipantsList(ctx.from);
      if (!requests.length) return ctx.reply("✅ No pending join requests.");
      let msg = `📋 *Pending Requests (${requests.length})*\n\n`;
      requests.forEach((r, i) => {
        msg += `${i + 1}. @${num(r.jid)}\n`;
      });
      msg += `\nApprove all: ${ctx.settings.prefix}acceptall\nReject all: ${ctx.settings.prefix}rejectall`;
      await ctx.sock.sendMessage(ctx.from, {
        text: msg,
        mentions: requests.map(r => r.jid),
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
