export default {
  name: "Dare",
  triggers: ["dare"],
  category: "fun",
  code: async (ctx) => {
    const list = [
      "Send a selfie to your 3 closest friends.",
      "Voice message someone random 'I love you'.",
      "Change your status to 'I'm a chicken' for 1 hour.",
      "Text your ex 'hi' (and screenshot it).",
      "Do 20 push-ups right now.",
      "Post an embarrassing photo of yourself.",
      "Call a friend and sing them a song.",
      "Speak in a British accent for the next 10 minutes.",
      "Send your last selfie to your family group.",
      "Say the alphabet backwards out loud."
    ];
    await ctx.reply(`🔥 *DARE*\n\n${list[Math.floor(Math.random() * list.length)]}`);
  }
};
