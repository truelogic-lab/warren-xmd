import fs from 'fs-extra';

export default {
  name: "SetOwnerName",
  triggers: ["setownername", "ownername"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Provide a new owner name.");
    try {
      let env = await fs.readFile('.env', 'utf8');
      if (env.match(/^OWNER_NAME=/m)) {
        env = env.replace(/^OWNER_NAME=.*/m, `OWNER_NAME=${ctx.text}`);
      } else {
        env += `\nOWNER_NAME=${ctx.text}`;
      }
      await fs.writeFile('.env', env);
      ctx.settings.ownerName = ctx.text;
      await ctx.reply(`✅ Owner name: *${ctx.text}*\n_Restart to apply._`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
