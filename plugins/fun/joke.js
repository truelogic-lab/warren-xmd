import axios from 'axios';

export default {
  name: "Joke",
  triggers: ["joke"],
  category: "fun",
  code: async (ctx) => {
    try {
      const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke');
      await ctx.reply(`😂 *${data.setup}*\n\n${data.punchline}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
