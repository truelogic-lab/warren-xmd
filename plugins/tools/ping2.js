export default {
  name: "Ping2",
  triggers: ["ping2", "speed"],
  category: "tools",
  code: async (ctx) => {
    const t1 = Date.now();
    const sent = await ctx.sock.sendMessage(ctx.from, { text: '🏓' }, { quoted: ctx.m });
    const latency = Date.now() - t1;
    const mem = process.memoryUsage();
    const up = process.uptime();
    await ctx.reply(`⚡ *Latency:* ${latency}ms\n💾 *Heap:* ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB\n⏱️ *Uptime:* ${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`);
  }
};
