import fs from 'fs-extra';

export default {
  name: "SetOwnerNumber",
  triggers: ["setownernumber", "ownernumber"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const number = ctx.args[0]?.replace(/\D/g, '');
    if (!number || number.length < 10) return ctx.reply("❌ Provide a valid number.");
    try {
      let env = await fs.readFile('.env', 'utf8');
      if (env.match(/^OWNER_NUMBER=/m)) {
        env = env.replace(/^OWNER_NUMBER=.*/m, `OWNER_NUMBER=${number}`);
      } else {
        env += `\nOWNER_NUMBER=${number}`;
      }
      await fs.writeFile('.env', env);
      ctx.settings.ownerNumber = number;
      await ctx.reply(`✅ Owner number: *${number}*\n_Restart to apply._`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
