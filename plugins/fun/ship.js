import { getMeta, num } from '../group/_helpers.js';

export default {
  name: "Ship",
  triggers: ["ship"],
  category: "fun",
  group: true,
  code: async (ctx) => {
    const meta = await getMeta(ctx.sock, ctx.from);
    const others = meta.participants.filter(p => p.id !== ctx.sender);
    const match = others[Math.floor(Math.random() * others.length)];
    const percent = Math.floor(Math.random() * 101);
    const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));
    const verdict =
      percent >= 90 ? "💍 Soulmates!" :
      percent >= 70 ? "💖 Great match!" :
      percent >= 50 ? "😊 Could work." :
      percent >= 30 ? "🤔 Give it time." :
      "💔 Not meant to be.";

    await ctx.sock.sendMessage(ctx.from, {
      text: `💘 *Love Meter*\n\n@${num(ctx.sender)}  ❤️  @${num(match.id)}\n\n[${bar}] ${percent}%\n${verdict}`,
      mentions: [ctx.sender, match.id]
    }, { quoted: ctx.m });
  }
};
