import axios from 'axios';

export default {
  name: "Color",
  triggers: ["color", "rcolor"],
  category: "tools",
  code: async (ctx) => {
    const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    const url = `https://singlecolorimage.com/get/${hex.slice(1)}/400x400`;
    await ctx.sock.sendMessage(ctx.from, {
      image: { url },
      caption: `🎨 Random Color: *${hex}*`
    }, { quoted: ctx.m });
  }
};
