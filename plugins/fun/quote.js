import axios from 'axios';

export default {
  name: "Quote",
  triggers: ["quote", "quotes"],
  category: "fun",
  code: async (ctx) => {
    try {
      const { data } = await axios.get('https://zenquotes.io/api/random');
      const q = data[0];
      await ctx.reply(`💭 _"${q.q}"_\n\n— *${q.a}*`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
