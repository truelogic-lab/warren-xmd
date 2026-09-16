import fs from 'fs-extra';

export default {
  name: "ListOwners",
  triggers: ["listowner", "owners"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    try {
      const data = await fs.readJson('./data/owner.json');
      let msg = `👑 *Owners (${data.owners.length})*\n\n`;
      data.owners.forEach((n, i) => msg += `${i + 1}. ${n}\n`);
      if (data.sudo?.length) {
        msg += `\n🛡️ *Sudo (${data.sudo.length})*\n\n`;
        data.sudo.forEach((n, i) => msg += `${i + 1}. ${n}\n`);
      }
      await ctx.reply(msg || "❌ No owners set.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
