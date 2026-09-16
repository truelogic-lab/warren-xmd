import axios from 'axios';

export default {
  name: "Fact",
  triggers: ["fact"],
  category: "fun",
  code: async (ctx) => {
    try {
      const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random');
      await ctx.reply(`💡 *Did you know?*\n\n${data.text}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
