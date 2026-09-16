import fs from 'fs-extra';

export default {
  name: "Prefix",
  triggers: ["prefix", "setprefix"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const newPrefix = ctx.args[0];
    if (!newPrefix) {
      return ctx.reply(`📖 Current prefix: *${ctx.settings.prefix}*\n\nChange: .prefix <new>`);
    }
    try {
      let env = await fs.readFile('.env', 'utf8');
      if (env.match(/^BOT_PREFIX=/m)) {
        env = env.replace(/^BOT_PREFIX=.*/m, `BOT_PREFIX=${newPrefix}`);
      } else {
        env += `\nBOT_PREFIX=${newPrefix}`;
      }
      await fs.writeFile('.env', env);
      ctx.settings.prefix = newPrefix;
      await ctx.reply(`✅ Prefix changed to *${newPrefix}*\n_Restart to apply._`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
