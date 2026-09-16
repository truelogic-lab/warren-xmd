export default {
  name: "Time",
  triggers: ["time", "date", "saa"],
  category: "tools",
  code: async (ctx) => {
    const now = new Date();
    const tz = ctx.settings.timezone;
    const time = now.toLocaleString('en-KE', { timeZone: tz });
    const unix = Math.floor(now.getTime() / 1000);
    await ctx.reply(`🕐 *Time (${tz})*\n${time}\n\n⏱️ Unix: ${unix}`);
  }
};
