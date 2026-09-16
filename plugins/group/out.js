export default {
  name: "Leave",
  triggers: ["out", "leave"],
  category: "group",
  admin: true,
  group: true,
  code: async (ctx) => {
    await ctx.reply("👋 Goodbye!");
    setTimeout(async () => {
      try { await ctx.sock.groupLeave(ctx.from); } catch {}
    }, 1000);
  }
};
