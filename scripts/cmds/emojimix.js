const axios = require("axios");

const TENOR_KEY = global.NixBot.keys.tenor;

function emojiToCodepoint(emoji) {
  const codePoints = [];
  for (let i = 0; i < emoji.length; i++) {
    const code = emoji.codePointAt(i);
    if (code > 0xFFFF) i++;
    if (code !== 0xFE0F) {
      codePoints.push(code.toString(16));
    }
  }
  return codePoints.join("-");
}

function isEmoji(str) {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{2934}-\u{2935}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2602}-\u{2660}\u{2663}-\u{2665}\u{2668}\u{267B}\u{267E}-\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}-\u{269C}\u{26A0}-\u{26A1}\u{26AA}-\u{26AB}\u{26B0}-\u{26B1}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26CE}-\u{26CF}\u{26D1}\u{26D3}-\u{26D4}\u{26E9}-\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}]/u;
  return emojiRegex.test(str);
}

function extractEmojis(text) {
  const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})(\u{FE0F}|\u{200D}\p{Emoji_Presentation}|\u{200D}\p{Extended_Pictographic})*/gu;
  const matches = text.match(emojiRegex);
  if (!matches) return [];
  return matches;
}

module.exports = {
  config: {
    name: "emojimix",
    aliases: ["mix"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    prefix: true,
    category: "utility",
    description: "Mix two emojis together to create a new emoji",
    guide: {
      en: "{pn} <emoji1> <emoji2> - Mix two emojis together"
        + "\nExample: {pn} 😀 😂"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply }) {
    const text = args.join(" ").trim();
    const emojis = extractEmojis(text);

    if (emojis.length < 2) {
      return reply("Please provide 2 emojis to mix.\nExample: !emojimix 😀 😂");
    }

    const emoji1 = emojis[0];
    const emoji2 = emojis[1];

    const query = `${emoji1}_${emoji2}`;

    try {
      const tenorApi = global.NixBot.apis.tenor + "/featured";
      const res = await axios.get(tenorApi, {
        params: {
          key: TENOR_KEY,
          client_key: "emoji_kitchen_funbox",
          collection: "emoji_kitchen_v6",
          q: query
        },
        timeout: 15000
      });

      let imageUrl = null;

      if (res.data?.results?.length > 0) {
        const result = res.data.results[0];
        imageUrl = result.media_formats?.png_transparent?.url || result.url;
      }

      if (!imageUrl) {
        const reverseQuery = `${emoji2}_${emoji1}`;
        const res2 = await axios.get(tenorApi, {
          params: {
            key: TENOR_KEY,
            client_key: "emoji_kitchen_funbox",
            collection: "emoji_kitchen_v6",
            q: reverseQuery
          },
          timeout: 15000
        });

        if (res2.data?.results?.length > 0) {
          const result = res2.data.results[0];
          imageUrl = result.media_formats?.png_transparent?.url || result.url;
        }
      }

      if (!imageUrl) {
        return reply(`Cannot mix ${emoji1} + ${emoji2}\nThis combination is not supported. Try different emojis.`);
      }

      const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 15000 });

      await sock.sendMessage(chatId, {
        image: Buffer.from(imgRes.data),
        caption: `${emoji1} + ${emoji2}`
      }, { quoted: event });

    } catch (e) {
      console.error("[EMOJIMIX] Error:", e.message);
      return reply("Failed to mix emojis. Please try again.");
    }
  }
};
