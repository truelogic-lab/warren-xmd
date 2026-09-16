import fs from 'fs-extra';

export default {
  name: "SetStickerName",
  triggers: ["setstickername", "stickername"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Provide a sticker pack name.");
    try {
      let cfg = {};
      try { cfg = await fs.readJson('./data/sticker.json'); } catch {}
      cfg.packName = ctx.text;
      await fs.writeJson('./data/sticker.json', cfg, { spaces: 2 });
      await ctx.reply(`✅ Sticker pack name: *${ctx.text}*`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
