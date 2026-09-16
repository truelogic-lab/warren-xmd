export default {
  name: "Shutdown",
  triggers: ["shutdown", "poweroff"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    await ctx.reply("🛑 Shutting down...");
    setTimeout(() => process.exit(1), 1500);
  }
};
