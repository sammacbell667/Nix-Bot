const axios = require("axios");

async function translate(text, targetLang) {
  const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`, { timeout: 15000 });
  return {
    text: res.data[0].map(item => item[0]).join(""),
    from: res.data[2]
  };
}

module.exports = {
  config: {
    name: "translate",
    aliases: ["t", "trans"],
    version: "1.0.0",
    author: "ArYAN",
    prefix: true,
    role: 0,
    countDown: 3,
    category: "utility",
    description: "Translate text to any language.",
    guide: {
      en: "{pn} <text> -> <lang>\n{pn} hello -> bn\n{pn} reply to a message -> bn"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply }) {
    const quoted = event.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || null;

    let text = "";
    let targetLang = "bn";

    const fullText = args.join(" ");
    const sepIdx = fullText.lastIndexOf("->");
    const sepIdx2 = fullText.lastIndexOf("=>");

    const bestSep = Math.max(sepIdx, sepIdx2);

    if (quotedText) {
      text = quotedText;
      if (args.length > 0) {
        if (bestSep !== -1) {
          targetLang = fullText.slice(bestSep + 2).trim();
        } else {
          targetLang = args[0].trim();
        }
      }
    } else {
      if (bestSep !== -1) {
        text = fullText.slice(0, bestSep).trim();
        targetLang = fullText.slice(bestSep + 2).trim();
      } else {
        text = fullText;
      }
    }

    if (!text) {
      return reply("Please provide text to translate.\nExample: !t hello -> bn");
    }

    if (!targetLang) targetLang = "bn";

    try {
      const result = await translate(text, targetLang);
      return reply(`${result.text}\n\n🌐 Translate from ${result.from} to ${targetLang}`);
    } catch (err) {
      console.error("[TRANSLATE ERROR]", err.message);
      return reply("⚠️ Translation failed. Try again.");
    }
  }
};
