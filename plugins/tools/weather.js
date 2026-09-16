import axios from 'axios';

export default {
  name: "Weather",
  triggers: ["weather", "haliyahewa"],
  category: "tools",
  code: async (ctx) => {
    const city = ctx.text;
    if (!city) return ctx.reply(`❌ Provide a city.\nExample: ${ctx.settings.prefix}weather Nairobi`);
    try {
      const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      const { data } = await axios.get(url);
      const cur = data.current_condition[0];
      const area = data.nearest_area[0];
      let msg = `🌤️ *Weather for ${area.areaName[0].value}, ${area.country[0].value}*\n\n`;
      msg += `🌡️ Temp: ${cur.temp_C}°C (feels ${cur.FeelsLikeC}°C)\n`;
      msg += `☁️ Condition: ${cur.weatherDesc[0].value}\n`;
      msg += `💧 Humidity: ${cur.humidity}%\n`;
      msg += `💨 Wind: ${cur.windspeedKmph} km/h\n`;
      msg += `👁️ Visibility: ${cur.visibility} km\n`;
      msg += `🌅 Sunrise: ${data.weather[0].astronomy[0].sunrise}\n`;
      msg += `🌇 Sunset: ${data.weather[0].astronomy[0].sunset}\n`;
      await ctx.reply(msg);
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
};
