import { downloadMediaMessage } from '@zentrix/baileys';

export default {
  name: "SetPP",
  triggers: ["setpp", "setbotpp", "setprofilepic"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const quoted = ctx.m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const direct = ctx.m.message;
    const imgMsg = quoted?.imageMessage || direct?.imageMessage;
    if (!imgMsg) return ctx.reply("❌ Send an image or reply to one with .setpp");

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
      await ctx.sock.updateProfilePicture(ctx.sock.user.id, buffer);
      await ctx.reply("✅ Bot profile picture updated.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
