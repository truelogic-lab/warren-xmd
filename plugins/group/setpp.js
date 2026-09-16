import { downloadMediaMessage } from '@angstvorfrauen/baileys';
import { invalidateGroup } from './_helpers.js';

export default {
  name: "SetGroupPP",
  triggers: ["setppgc", "setgcpp", "setgrouppp"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    const quoted = ctx.m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const direct = ctx.m.message?.imageMessage;
    const imgMsg = quoted?.imageMessage || direct;

    if (!imgMsg) return ctx.reply("❌ Send an image or reply to an image with .setppgc");

    try {
      const fakeMsg = {
        key: {
          remoteJid: ctx.from,
          id: ctx.m.message.extendedTextMessage?.contextInfo?.stanzaId || ctx.m.key.id,
          fromMe: false,
        },
        message: quoted || ctx.m.message,
      };
      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
        logger: { level: 'silent' },
        reuploadRequest: ctx.sock.updateMediaMessage,
      });
      await ctx.sock.updateProfilePicture(ctx.from, buffer);
      invalidateGroup(ctx.from);
      await ctx.reply("✅ Group profile picture updated.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
