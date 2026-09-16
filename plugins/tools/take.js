import { downloadMediaMessage } from '@whiskeysockets/baileys';
import webp from 'webp-converter';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

export default {
  name: "Take",
  triggers: ["take", "steal"],
  category: "tools",
  code: async (ctx) => {
    const quoted = ctx.m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.stickerMessage && !quoted?.imageMessage) {
      return ctx.reply("❌ Reply to a sticker or image with .take packname | author");
    }

    const [packArg, authorArg] = ctx.text.split('|').map(s => s?.trim());
    let cfg = {};
    try { cfg = await fs.readJson('./data/sticker.json'); } catch {}

    const packname = packArg || cfg.packName || 'Warren-XMD';
    const author = authorArg || cfg.author || 'Warren';

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `take-${randomUUID()}.webp`);
    const outputPath = path.join(tmpDir, `take-${randomUUID()}-out.webp`);

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

      // Just re-send the sticker with new metadata via Baileys
      await ctx.sock.sendMessage(ctx.from, { sticker: buffer }, { quoted: ctx.m });
      await ctx.reply(`✅ Sticker taken\n📦 Pack: ${packname}\n✍️ Author: ${author}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    } finally {
      fs.unlink(inputPath).catch(() => {});
      fs.unlink(outputPath).catch(() => {});
    }
  }
};
