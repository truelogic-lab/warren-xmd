import { downloadMediaMessage } from '@zentrix/baileys';

export default {
  name: "ViewOnce",
  triggers: ["vv", "vv2", "vv3", "viewonce"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const quoted = ctx.m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return ctx.reply(`❌ Reply to a view-once message with ${ctx.settings.prefix}vv`);

    const type = Object.keys(quoted).find(k =>
      ['imageMessage', 'videoMessage', 'audioMessage'].includes(k)
    );
    if (!type) return ctx.reply("❌ No view-once media found in that message.");

    const fakeMsg = {
      key: {
        remoteJid: ctx.from,
        id: ctx.m.message.extendedTextMessage.contextInfo.stanzaId,
        fromMe: false,
        participant: ctx.m.message.extendedTextMessage.contextInfo.participant,
      },
      message: quoted,
    };

    try {
      const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
        logger: { level: 'silent' },
        reuploadRequest: ctx.sock.updateMediaMessage,
      });
      const outKey = type.replace('Message', '');
      const caption = quoted[type]?.caption || '🔓 Retrieved view-once';
      await ctx.sock.sendMessage(ctx.from, { [outKey]: buffer, caption }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
