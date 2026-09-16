import { getHealth } from '../../lib/antiban.js';
import { fancy } from '../../lib/fancy.js';

export default {
  name: "Health",
  triggers: ["health", "sessionhealth"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    try {
      const phone = ctx.args[0]?.replace(/\D/g, '') || ctx.botNumber;
      const h = await getHealth(phone);

      const emoji = h.riskLevel === 'low' ? '🟢' : h.riskLevel === 'medium' ? '🟡' : '🔴';

      let msg = `━━━━━『 ${fancy('session health')} 』━━━━━\n\n`;
      msg += `📱 *Number:* ${h.phoneNumber}\n`;
      msg += `${emoji} *Risk:* ${h.riskLevel.toUpperCase()} (${h.riskScore}/100)\n`;
      msg += `\n🌡️ *Warm-up:* ${h.warmupProgress}\n`;
      msg += `📊 *Daily:* ${h.dailyUsed}/${h.dailyLimit}\n`;
      msg += `📨 *Total sent:* ${h.totalSent}\n`;
      msg += `\n💡 _Low risk = safe to send. High risk = slow down._`;

      await ctx.reply(msg);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
