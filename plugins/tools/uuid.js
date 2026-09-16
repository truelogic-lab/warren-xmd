import crypto from 'crypto';

export default {
  name: "UUID",
  triggers: ["uuid"],
  category: "tools",
  code: async (ctx) => {
    await ctx.reply(`🆔 \`${crypto.randomUUID()}\``);
  }
};
