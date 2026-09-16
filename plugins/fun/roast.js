import { resolveTarget, num } from '../group/_helpers.js';

export default {
  name: "Roast",
  triggers: ["roast"],
  category: "fun",
  code: async (ctx) => {
    const target = resolveTarget(ctx.m, ctx.args) || ctx.sender;
    const list = [
      "You're the reason shampoo bottles have instructions.",
      "I'd agree with you but then we'd both be wrong.",
      "You bring everyone so much joy... when you leave the room.",
      "You're not stupid; you just have bad luck thinking.",
      "If laziness was an Olympic sport, you'd come in 4th so you don't have to walk to the podium.",
      "You're like a cloud. When you disappear, it's a beautiful day.",
      "I'm jealous of everyone who hasn't met you.",
      "You have the perfect face for radio.",
      "You're the human version of a Monday morning.",
      "Somewhere a tree is working hard to produce your oxygen — apologize to it."
    ];
    const r = list[Math.floor(Math.random() * list.length)];
    await ctx.sock.sendMessage(ctx.from, {
      text: `🔥 @${num(target)}\n\n${r}`,
      mentions: [target]
    }, { quoted: ctx.m });
  }
};
