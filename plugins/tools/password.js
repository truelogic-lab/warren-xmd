import crypto from 'crypto';

export default {
  name: "Password",
  triggers: ["password", "genpass"],
  category: "tools",
  code: async (ctx) => {
    const len = Math.min(parseInt(ctx.args[0]) || 16, 64);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) pass += chars[bytes[i] % chars.length];
    await ctx.reply(`🔐 *Generated Password (${len} chars):*\n\`${pass}\``);
  }
};
