export default {
  name: "Compliment",
  triggers: ["compliment", "nice"],
  category: "fun",
  code: async (ctx) => {
    const list = [
      "You're an awesome friend.", "You light up the room.",
      "You're someone's reason to smile.", "You're even better than a unicorn.",
      "You have a great sense of humor.", "You're incredibly thoughtful.",
      "You're the best listener I know.", "You bring out the best in others.",
      "You're braver than you believe.", "You deserve a hug right now.",
      "Your smile is contagious.", "You're a smart cookie.",
      "You're stronger than you seem.", "You're a treasure.",
      "You're amazing — don't forget it."
    ];
    const pick = list[Math.floor(Math.random() * list.length)];
    await ctx.reply(`💐 ${pick}`);
  }
};
