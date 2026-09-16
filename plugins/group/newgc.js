export default {
  name: "NewGroup",
  triggers: ["newgc", "creategc", "newgroup"],
  category: "group",
  group: true,
  code: async (ctx) => {
    // Usage: .newgc Group Name | 254xxx | 254yyy
    if (!ctx.text) return ctx.reply(`❌ Usage: ${ctx.settings.prefix}newgc Group Name | 254xxx | 254yyy`);
    const parts = ctx.text.split('|').map(s => s.trim()).filter(Boolean);
    const name = parts[0];
    const numbers = parts.slice(1).map(n => n.replace(/\D/g, '')).filter(n => n.length >= 10);
    if (!name) return ctx.reply("❌ Provide a group name.");

    try {
      const participants = numbers.map(n => `${n}@s.whatsapp.net`);
      const group = await ctx.sock.groupCreate(name, participants);
      await ctx.reply(`✅ Group created!\nName: ${name}\nJID: ${group.id}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
