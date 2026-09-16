import fs from 'fs-extra';
import { resolveTarget, num } from '../group/_helpers.js';
import { invalidateOwnersCache } from '../../lib/handler.js';

export default {
  name: "AddSudo",
  triggers: ["setsudo", "addsudo"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args);
    if (!target) return ctx.reply("❌ Reply, mention, or provide a number.");
    const number = num(target);
    try {
      const data = await fs.readJson('./data/owner.json');
      data.sudo ||= [];
      if (!data.sudo.includes(number)) {
        data.sudo.push(number);
        await fs.writeJson('./data/owner.json', data, { spaces: 2 });
        invalidateOwnersCache();
      }
      await ctx.reply(`✅ Added sudo: ${number}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
