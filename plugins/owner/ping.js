export default {
  name: "Ping",
  triggers: ["ping", "alive", "uptime"],
  category: "main",
  code: async (ctx) => {
    const start = Date.now();
    await ctx.reply('🏓 Pong...');
    const latency = Date.now() - start;
    const uptime = process.uptime();
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    const s = Math.floor(uptime % 60);
    await ctx.reply(`⚡ *Speed:* ${latency}ms\n⏱️ *Uptime:* ${h}h ${m}m ${s}s`);
  }
};
