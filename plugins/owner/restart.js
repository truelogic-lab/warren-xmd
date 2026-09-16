export default {
  name: "Restart",
  triggers: ["restart", "reboot"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    await ctx.reply("🔄 Restarting bot...");
    setTimeout(() => process.exit(0), 1500);
  }
};
