import fs from 'fs-extra';

export default {
  name: "SetBotNameEnv",
  triggers: ["setbotnameenv", "botname"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Provide a new bot name.");
    try {
      let env = await fs.readFile('.env', 'utf8');
      if (env.match(/^BOT_NAME=/m)) {
        env = env.replace(/^BOT_NAME=.*/m, `BOT_NAME=${ctx.text}`);
      } else {
        env += `\nBOT_NAME=${ctx.text}`;
      }
      await fs.writeFile('.env', env);
      ctx.settings.botName = ctx.text;
      await ctx.reply(`✅ Bot name: *${ctx.text}*\n_Restart to apply._`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
