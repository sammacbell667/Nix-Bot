const axios = require("axios");

async function getAudio(text, lang = "en") {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
  const res = await axios.get(url, { responseType: "arraybuffer", headers: { "User-Agent": "Mozilla/5.0" }, timeout: 15000 });
  return Buffer.from(res.data);
}

async function detectLang(text) {
  try {
    const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`, { timeout: 10000 });
    return res.data[2] || "en";
  } catch (e) {
    return "en";
  }
}

module.exports = {
  config: {
    name: "say",
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    prefix: true,
    category: "utility",
    description: "Bot will say your message in voice",
    guide: {
      en: "{pn} <message> - Bot will say your message in voice"
        + "\n{pn} (reply to message) - Bot will say that message in voice"
        + "\n{pn} -<lang> <message> - Specify language (e.g. !say -bn hello)"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply }) {
    const quoted = event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.imageMessage?.caption || quoted?.videoMessage?.caption || null;

    let lang = null;
    let text = "";

    if (args[0] && args[0].startsWith("-") && args[0].length >= 2 && args[0].length <= 4) {
      lang = args[0].slice(1).toLowerCase();
      text = args.slice(1).join(" ").trim();
    } else {
      text = args.join(" ").trim();
    }

    if (!text && quotedText) {
      text = quotedText.trim();
    }

    if (!text) return reply("Please provide a message or reply to a message.");

    if (text.length > 200) return reply("Message too long. Maximum 200 characters.");

    if (!lang) {
      lang = await detectLang(text);
    }

    try {
      const audioBuffer = await getAudio(text, lang);

      await sock.sendMessage(chatId, {
        audio: audioBuffer,
        mimetype: "audio/mpeg",
        ptt: true
      }, { quoted: event });
    } catch (e) {
      console.error("[SAY] TTS error:", e.message);
      return reply("Failed to generate voice. Please try again.");
    }
  }
};
