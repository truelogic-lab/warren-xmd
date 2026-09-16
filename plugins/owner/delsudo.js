import fs from 'fs-extra';
import { resolveTarget, num } from '../group/_helpers.js';
import { invalidateOwnersCache } from '../../lib/handler.js';

export default {
  name: "DelSudo",
  triggers: ["delsudo", "removesudo"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Reply, mention, or provide a number.");
    const number = num(target);
    try {
      const data = await fs.readJson('./data/owner.json');
      data.sudo = (data.sudo || []).filter(n => n !== number);
      await fs.writeJson('./data/owner.json', data, { spaces: 2 });
      invalidateOwnersCache();
      await ctx.reply(`✅ Removed sudo: ${number}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
