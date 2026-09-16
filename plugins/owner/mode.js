import fs from 'fs-extra';

export default {
  name: "Mode",
  triggers: ["mode"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (!['public', 'private'].includes(sub)) {
      return ctx.reply(`📖 *Mode*\n\n.mode public — everyone can use commands\n.mode private — only owners can use commands\n\nCurrent: *${ctx.settings.mode}*`);
    }
    try {
      let env = await fs.readFile('.env', 'utf8');
      if (env.match(/^BOT_MODE=/m)) {
        env = env.replace(/^BOT_MODE=.*/m, `BOT_MODE=${sub}`);
      } else {
        env += `\nBOT_MODE=${sub}`;
      }
      await fs.writeFile('.env', env);
      ctx.settings.mode = sub;
      await ctx.reply(`✅ Mode set to *${sub}*\n_Restart to apply._`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
