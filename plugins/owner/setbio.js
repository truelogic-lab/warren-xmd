export default {
  name: "SetBio",
  triggers: ["setbio", "setstatus"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Provide a bio text.");
    try {
      await ctx.sock.updateProfileStatus(ctx.text);
      await ctx.reply("✅ Bio updated.");
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
