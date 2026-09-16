export default {
  name: "Broadcast",
  triggers: ["broadcast", "bc"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Usage: ${ctx.settings.prefix}broadcast Your message here`);

    const groups = await ctx.sock.groupFetchAllParticipating();
    const jids = Object.keys(groups);
    if (!jids.length) return ctx.reply("❌ Bot is not in any groups.");

    await ctx.reply(`📤 Broadcasting to ${jids.length} group(s)...`);

    let sent = 0, failed = 0;
    for (const jid of jids) {
      try {
        await ctx.sock.sendMessage(jid, { text: `📢 *Broadcast*\n\n${ctx.text}` });
        sent++;
        await new Promise(r => setTimeout(r, 1200));
      } catch {
        failed++;
      }
    }
    await ctx.reply(`✅ Sent: ${sent}\n❌ Failed: ${failed}`);
  }
};
