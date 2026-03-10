const axios = require("axios");

module.exports = {
  config: {
    name: "weather",
    aliases: ["wthr"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    description: "Fetches the current weather for a specified city",
    category: "utility",
    guide: {
      en: "{pn} <city> - Get current weather for the specified city"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply }) {
    if (args.length === 0) return reply("Please provide a city name.");

    const city = args.join(" ");
    try {
      const apiKey = global.NixBot.keys.weather;
      const weatherApi = global.NixBot.apis.weather;
      const response = await axios.get(`${weatherApi}/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
      const w = response.data;

      const text = `🌤 𝗪𝗲𝗮𝘁𝗵𝗲𝗿 𝗥𝗲𝗽𝗼𝗿𝘁\n\n📍 𝗖𝗶𝘁𝘆: ${w.name}, ${w.sys?.country || ""}\n🌡 𝗧𝗲𝗺𝗽: ${w.main.temp}°C\n🌡 𝗙𝗲𝗲𝗹𝘀 𝗟𝗶𝗸𝗲: ${w.main.feels_like}°C\n☁️ 𝗦𝗸𝘆: ${w.weather[0].description}\n💧 𝗛𝘂𝗺𝗶𝗱𝗶𝘁𝘆: ${w.main.humidity}%\n💨 𝗪𝗶𝗻𝗱: ${w.wind.speed} m/s`;

      await sock.sendMessage(chatId, { text }, { quoted: event });
    } catch (e) {
      console.error("[WEATHER] Error:", e.message);
      if (e.response?.status === 404) {
        return reply(`City "${city}" not found. Please check the name.`);
      }
      reply("Sorry, could not fetch the weather right now.");
    }
  }
};
