import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
  name: "Save",
  triggers: ["save", "savemedia"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const quoted = ctx.m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const direct = ctx.m.message;
    const msg = quoted || direct;

    const type = Object.keys(msg).find(k =>
      ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(k)
    );
    if (!type) return ctx.reply("❌ Reply to media with .save");

    const fakeMsg = {
      key: {
        remoteJid: ctx.from,
        id: ctx.m.message.extendedTextMessage?.contextInfo?.stanzaId || ctx.m.key.id,
        fromMe: false,
      },
      message: msg,
    };

    try {
      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
        logger: { level: 'silent' },
        reuploadRequest: ctx.sock.updateMediaMessage,
      });
      const outKey = type.replace('Message', '');
      await ctx.sock.sendMessage(ctx.from, { [outKey]: buffer }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
