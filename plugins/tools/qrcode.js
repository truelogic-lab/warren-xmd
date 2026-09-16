import axios from 'axios';

export default {
  name: "QRCode",
  triggers: ["qr", "qrcode"],
  category: "tools",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Provide text or URL.\nExample: ${ctx.settings.prefix}qr https://example.com`);
    try {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(ctx.text)}`;
      const { data } = await axios.get(url, { responseType: 'arraybuffer' });
      await ctx.sock.sendMessage(ctx.from, { image: Buffer.from(data) }, { quoted: ctx.m });
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
