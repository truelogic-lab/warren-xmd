import fs from 'fs-extra';

export default {
  name: "ListSudo",
  triggers: ["listsudo", "sudos"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    try {
      const data = await fs.readJson('./data/owner.json');
      const sudo = data.sudo || [];
      if (!sudo.length) return ctx.reply("❌ No sudo users set.");
      let msg = `🛡️ *Sudo Users (${sudo.length})*\n\n`;
      sudo.forEach((n, i) => msg += `${i + 1}. ${n}\n`);
      await ctx.reply(msg);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
