import { downloadMediaMessage } from '@whiskeysockets/baileys';
import webp from 'webp-converter';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

export default {
  name: "ToImage",
  triggers: ["toimage", "toimg", "tophoto"],
  category: "tools",
  code: async (ctx) => {
    const quoted = ctx.m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.stickerMessage) return ctx.reply("❌ Reply to a sticker with .toimage");

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `toimg-${randomUUID()}.webp`);
    const outputPath = path.join(tmpDir, `toimg-${randomUUID()}.png`);

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

      await fs.writeFile(inputPath, buffer);
      await webp.dwebp(inputPath, outputPath, "-o 100");

      const pngBuf = await fs.readFile(outputPath);
      await ctx.sock.sendMessage(ctx.from, { image: pngBuf }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    } finally {
      fs.unlink(inputPath).catch(() => {});
      fs.unlink(outputPath).catch(() => {});
    }
  }
};
