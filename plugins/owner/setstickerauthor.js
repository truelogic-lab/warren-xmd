import fs from 'fs-extra';

export default {
  name: "SetStickerAuthor",
  triggers: ["setstickerauthor", "stickerauthor"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Provide a sticker author name.");
    try {
      let cfg = {};
      try { cfg = await fs.readJson('./data/sticker.json'); } catch {}
      cfg.author = ctx.text;
      await fs.writeJson('./data/sticker.json', cfg, { spaces: 2 });
      await ctx.reply(`✅ Sticker author: *${ctx.text}*`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
