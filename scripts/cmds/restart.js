const fs = require("fs");
const path = require("path");

const RESTART_FILE = path.join(__dirname, "tmp", "restart.txt");
let restartChecked = false;

module.exports = {
  config: {
    name: "restart",
    version: "1.0.0",
    author: "ArYAN",
    countDown: 5,
    role: 2,
    prefix: true,
    description: {
      en: "Restart bot"
    },
    category: "Owner",
    guide: {
      en: "{pn}: Restart bot"
    }
  },

  onChat: async function ({ sock }) {
    if (restartChecked) return;
    restartChecked = true;

    if (!fs.existsSync(RESTART_FILE)) return;
    try {
      const data = fs.readFileSync(RESTART_FILE, "utf-8").trim();
      const [chatId, time] = data.split(" ");
      if (chatId && time && Number.isFinite(Number(time))) {
        const elapsed = ((Date.now() - Number(time)) / 1000).toFixed(2);
        await sock.sendMessage(chatId, { text: `✅ Bot restarted successfully\n⏰ Time: ${elapsed}s` });
      }
      fs.unlinkSync(RESTART_FILE);
    } catch (e) {
      try { fs.unlinkSync(RESTART_FILE); } catch (_) {}
    }
  },

  onStart: async function ({ sock, chatId, message, event, reply }) {
    const tmpDir = path.join(__dirname, "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const msg = event || message;
    await sock.sendMessage(chatId, { text: "🔄 Restarting bot..." }, { quoted: msg });

    await new Promise(r => setTimeout(r, 1000));

    fs.writeFileSync(RESTART_FILE, `${chatId} ${Date.now()}`);
    process.exit(2);
  }
};
