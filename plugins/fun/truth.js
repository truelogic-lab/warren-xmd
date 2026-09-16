export default {
  name: "Truth",
  triggers: ["truth"],
  category: "fun",
  code: async (ctx) => {
    const list = [
      "What's the biggest lie you've ever told?",
      "Who was your first crush?",
      "What's the most embarrassing thing you've done?",
      "Have you ever stolen something?",
      "What's your biggest fear?",
      "What's the last thing you searched on your phone?",
      "Who's the last person you texted?",
      "What's your guilty pleasure?",
      "Have you ever faked being sick?",
      "What's the worst advice you've ever received?"
    ];
    await ctx.reply(`❓ *TRUTH*\n\n${list[Math.floor(Math.random() * list.length)]}`);
  }
};
