import axios from 'axios';

export default {
  name: "Translate",
  triggers: ["trt", "translate"],
  category: "tools",
  code: async (ctx) => {
    // Usage: .trt <lang> <text>
    const [lang, ...rest] = ctx.args;
    const text = rest.join(' ');
    if (!lang || !text) {
      return ctx.reply(`❌ Usage: ${ctx.settings.prefix}trt <lang> <text>\nExample: ${ctx.settings.prefix}trt sw Hello my friend`);
    }
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
      const { data } = await axios.get(url);
      const translated = data[0].map(x => x[0]).join('');
      await ctx.reply(`🌍 *${data[2] || 'auto'} → ${lang}*\n\n${translated}`);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
