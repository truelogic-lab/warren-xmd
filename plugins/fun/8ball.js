export default {
  name: "8Ball",
  triggers: ["8ball", "ask8"],
  category: "fun",
  code: async (ctx) => {
    if (!ctx.text) return ctx.reply("❌ Ask a yes/no question.\nExample: .8ball Will I win today?");
    const answers = [
      "🎱 It is certain.", "🎱 It is decidedly so.", "🎱 Without a doubt.",
      "🎱 Yes — definitely.", "🎱 You may rely on it.", "🎱 As I see it, yes.",
      "🎱 Most likely.", "🎱 Outlook good.", "🎱 Yes.",
      "🎱 Signs point to yes.", "🎱 Reply hazy, try again.", "🎱 Ask again later.",
      "🎱 Better not tell you now.", "🎱 Cannot predict now.", "🎱 Concentrate and ask again.",
      "🎱 Don't count on it.", "🎱 My reply is no.", "🎱 My sources say no.",
      "🎱 Outlook not so good.", "🎱 Very doubtful."
    ];
    const ans = answers[Math.floor(Math.random() * answers.length)];
    await ctx.reply(`❓ *${ctx.text}*\n\n${ans}`);
  }
};
