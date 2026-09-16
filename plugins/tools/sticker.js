import { downloadMediaMessage } from '@angstvorfrauen/baileys';
import webp from 'webp-converter';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

export default {
  name: "Sticker",
  triggers: ["sticker", "s", "stick"],
  category: "tools",
  code: async (ctx) => {
    const quoted = ctx.m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const direct = ctx.m.message;
    const msg = quoted || direct;
    const type = Object.keys(msg).find(k =>
      ['imageMessage', 'videoMessage'].includes(k)
    );
    if (!type) return ctx.reply("❌ Reply to an image or video with .sticker");

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `sticker-${randomUUID()}.${type === 'imageMessage' ? 'jpg' : 'mp4'}`);
    const outputPath = path.join(tmpDir, `sticker-${randomUUID()}.webp`);

    try {
      const fakeMsg = {
        key: {
          remoteJid: ctx.from,
          id: ctx.m.message.extendedTextMessage?.contextInfo?.stanzaId || ctx.m.key.id,
          fromMe: false,
        },
        message: msg,
      };

      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
        logger: { level: 'silent' },
        reuploadRequest: ctx.sock.updateMediaMessage,
      });

      await fs.writeFile(inputPath, buffer);

      if (type === 'imageMessage') {
        await webp.cwebp(inputPath, outputPath, "-q 80");
      } else {
        // webp-converter can't do video directly; use ffmpeg via ffmpeg-static
        await fs.writeFile(inputPath.replace('.mp4', '.webm'), buffer);
        await ctx.reply("⚠️ Video stickers require ffmpeg — trying image conversion instead.");
        await webp.cwebp(inputPath, outputPath, "-q 80");
      }

      const stickerBuf = await fs.readFile(outputPath);
      await ctx.sock.sendMessage(ctx.from, { sticker: stickerBuf }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    } finally {
      fs.unlink(inputPath).catch(() => {});
      fs.unlink(outputPath).catch(() => {});
    }
  }
};
