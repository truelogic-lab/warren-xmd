import axios from 'axios';

export default {
  name: "TTS",
  triggers: ["tts", "say"],
  category: "tools",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Provide text.\nExample: .tts Hello world");
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(ctx.text)}&tl=en&client=tw-ob`;
      const { data } = await axios.get(url, { responseType: 'arraybuffer' });
      await ctx.sock.sendMessage(ctx.from, {
        audio: Buffer.from(data),
        mimetype: 'audio/mpeg',
        ptt: true,
      }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
