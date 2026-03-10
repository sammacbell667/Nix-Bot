const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "loadconfig",
    aliases: ["loadcf"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 2,
    prefix: true,
    category: "owner",
    description: "Reload config of bot",
    guide: {
      en: "{pn} - Reload bot config from config.json"
    }
  },

  onStart: async function ({ reply }) {
    try {
      const configPath = path.join(process.cwd(), "config.json");
      delete require.cache[require.resolve(configPath)];
      const newConfig = require(configPath);
      global.config = newConfig;
      global.NixBot.config = newConfig;
      return reply("Config has been reloaded successfully.");
    } catch (e) {
      console.error("[LOADCONFIG ERROR]", e.message);
      return reply("❌ Failed to reload config: " + e.message);
    }
  }
};
