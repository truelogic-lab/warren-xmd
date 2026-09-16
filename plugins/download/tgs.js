import { downloadMediaMessage } from '@whiskeysockets/baileys';

export default {
  name: "TelegramSticker",
  triggers: ["tgs", "tgsticker"],
  category: "download",
  code: async (ctx) => {
    const quoted = ctx.m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.stickerMessage && !quoted?.imageMessage && !quoted?.videoMessage) {
      return ctx.reply("❌ Reply to a sticker or media to convert.");
    }
    try {
      const fakeMsg = {
        key: {
          remoteJid: ctx.from,
          id: ctx.m.message.extendedTextMessage.contextInfo.stanzaId,
          fromMe: false,
        },
        message: quoted,
      };
      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
        logger: { level: 'silent' },
        reuploadRequest: ctx.sock.updateMediaMessage,
      });
      // Re-send as WhatsApp sticker (already webp for stickers)
      await ctx.sock.sendMessage(ctx.from, { sticker: buffer }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
