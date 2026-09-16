export default {
  name: "BroadcastAdmin",
  triggers: ["broadcastgc", "bcgc"],
  category: "owner",
  owner: true,
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply(`❌ Usage: ${ctx.settings.prefix}broadcastgc Your message`);
    const groups = await ctx.sock.groupFetchAllParticipating();
    const botJid = ctx.sock.user.id;
    const adminGroups = Object.values(groups).filter(g =>
      g.participants.some(p => p.id === botJid && p.admin)
    );
    if (!adminGroups.length) return ctx.reply("❌ Bot is not admin in any group.");

    await ctx.reply(`📤 Broadcasting to ${adminGroups.length} admin group(s)...`);
    let sent = 0;
    for (const g of adminGroups) {
      try {
        await ctx.sock.sendMessage(g.id, { text: `📢 *Broadcast*\n\n${ctx.text}` });
        sent++;
        await new Promise(r => setTimeout(r, 1200));
      } catch {}
    }
    await ctx.reply(`✅ Sent: ${sent}/${adminGroups.length}`);
  }
};
