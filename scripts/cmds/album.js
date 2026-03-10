const axios = require("axios");
const fs = require("fs");
const path = require("path");

const aryan = "https://nix-album-api.vercel.app";
const nix = "https://apis-toop.vercel.app/aryan/imgur";
const cacheDir = path.join(__dirname, "cache");

module.exports = {
  config: {
    name: "album",
    version: "0.0.3",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    description: {
      en: "Video album categories"
    },
    category: "media",
    guide: {
      en: "{pn} [page]\n{pn} add [category] [URL]\n{pn} list"
    }
  },

  onStart: async function ({ sock, chatId, args, event, senderId, reply }) {
    if (args[0] === "add") {
      const category = args[1]?.toLowerCase();
      const videoUrl = args[2];

      if (!category || !videoUrl) {
        return reply("[⚜️]➜ Usage: !album add [category] [video_url]");
      }

      try {
        const imgurResponse = await axios.get(nix, { params: { url: videoUrl }, timeout: 30000 });
        if (!imgurResponse.data || !imgurResponse.data.imgur) throw new Error("Imgur upload failed.");

        const addResponse = await axios.post(`${aryan}/api/album/add`, {
          category,
          videoUrl: imgurResponse.data.imgur,
        }, { timeout: 15000 });

        return reply(addResponse.data.message);
      } catch (error) {
        return reply(`[⚜️]➜ Failed to add video: ${error.message}`);
      }
    }

    if (args[0] === "list") {
      try {
        const response = await axios.get(`${aryan}/api/category/list`, { timeout: 15000 });
        if (response.data.success) {
          const list = response.data.categories.map((cat, i) => `${i + 1}. ${cat}`).join("\n");
          return reply(`𝐀𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐀𝐥𝐛𝐮𝐦 𝐂𝐚𝐭𝐞𝐠𝐨𝐫𝐢𝐞𝐬:\n\n${list}`);
        }
      } catch (e) {
        return reply("Error fetching categories.");
      }
    }

    const categoriesInJson = ["funny", "islamic", "sad", "anime", "lofi", "attitude", "ff", "love", "horny", "baby", "romantic", "cartoon", "pubg", "emotional", "meme", "song", "friend", "trending", "hinata", "gojo", "car", "cat", "random", "game", "asif", "azhari", "girl", "travel", "food", "nature", "tiktok", "naruto", "phone", "editing", "neymar", "messi", "ronaldo", "football", "hindi", "18+"];
    const displayNames = ["𝐅𝐮𝐧𝐧𝐲 𝐕𝐢𝐝𝐞𝐨", "𝐈𝐬𝐥𝐚𝐦𝐢𝐜 𝐕𝐢𝐝𝐞𝐨", "𝐒𝐚𝐝 𝐕𝐢𝐝𝐞𝐨", "𝐀𝐧𝐢𝐦𝐞 𝐕𝐢𝐝𝐞𝐨", "𝐋𝐨𝐅𝐈 𝐕𝐢𝐝𝐞𝐨", "𝐀𝐭𝐭𝐢𝐭𝐮𝐝𝐞 𝐕𝐢𝐝𝐞𝐨", "𝐅𝐟 𝐕𝐢𝐝𝐞𝐨", "𝐋𝐨𝐯𝐞 𝐕𝐢𝐝𝐞𝐨", "𝐡𝐨𝐫𝐧𝐲 𝐕𝐢𝐝𝐞𝐨", "𝐛𝐚𝐛𝐲 𝐕𝐢𝐝𝐞𝐨", "𝐫𝐨𝐦𝐚𝐧𝐭𝐢𝐜 𝐕𝐢𝐝𝐞𝐨", "𝐜𝐚𝐫𝐭𝐨𝐨𝐧 𝐕𝐢𝐝𝐞𝐨", "𝐩𝐮𝐛𝐠 𝐕𝐢𝐝𝐞𝐨", "𝐞𝐦𝐨𝐭𝐢𝐨𝐧𝐚𝐥 𝐕𝐢𝐝𝐞𝐨", "𝐦𝐞𝐦𝐞 𝐕𝐢𝐝𝐞𝐨", "𝐬𝐨𝐧𝐠 𝐕𝐢𝐝𝐞𝐨", "𝐟𝐫𝐢𝐞𝐧𝐝 𝐕𝐢𝐝𝐞𝐨", "𝐭𝐫𝐞𝐧𝐝𝐢𝐧𝐠 𝐕𝐢𝐝𝐞𝐨", "𝐡𝐢𝐧𝐚𝐭𝐚 𝐕𝐢𝐝𝐞𝐨", "𝐠𝐨𝐣𝐨 𝐕𝐢𝐝𝐞𝐨", "𝐜𝐚𝐫 𝐕𝐢𝐝𝐞𝐨", "𝐜𝐚𝐭 𝐕𝐢𝐝𝐞𝐨", "𝐫𝐚𝐧𝐝𝐨𝐦 𝐕𝐢𝐝𝐞𝐨", "𝐠𝐚𝐦𝐞 𝐕𝐢𝐝𝐞𝐨", "𝐚𝐬𝐢𝐟 𝐡𝐮𝐣𝐮𝐫 𝐕𝐢𝐝𝐞𝐨", "𝐚𝐳𝐡𝐚𝐫𝐢 𝐡𝐮𝐣𝐮𝐫 𝐕𝐢𝐝𝐞𝐨", "𝐠𝐢𝐫𝐥 𝐕𝐢𝐝𝐞𝐨", "𝐭𝐫𝐚𝐯𝐞𝐥 𝐕𝐢𝐝𝐞𝐨", "𝐟𝐨𝐨𝐝 𝐕𝐢𝐝𝐞𝐨", "𝐧𝐚𝐭𝐮𝐫𝐞 𝐕𝐢𝐝𝐞𝐨", "𝐭𝐢𝐤𝐭𝐨𝐤 𝐕𝐢𝐝𝐞𝐨", "𝐧𝐚𝐫𝐮𝐭𝐨 𝐕𝐢𝐝𝐞𝐨", "𝐩𝐡𝐨𝐧𝐞 𝐕𝐢𝐝𝐞𝐨", "𝐞𝐝𝐢𝐭𝐢𝐧𝐠 𝐕𝐢𝐝𝐞𝐨", "𝐍𝐞𝐲𝐦𝐚𝐫 𝐕𝐢𝐝𝐞𝐨", "𝐌𝐞𝐬𝐬𝐢 𝐕𝐢𝐝𝐞𝐨", "𝐑𝐨𝐧𝐚𝐥𝐝𝐨 𝐕𝐢𝐝𝐞𝐨", "𝐅𝐨𝐨𝐭𝐛𝐚𝐥𝐥 𝐕𝐢𝐝𝐞𝐨", "𝐡𝐢𝐧𝐝𝐢 𝐕𝐢𝐝𝐞𝐨", "18+ 𝐕𝐢𝐝𝐞𝐨"];

    const itemsPerPage = 10;
    const page = parseInt(args[0]) || 1;
    const totalPages = Math.ceil(displayNames.length / itemsPerPage);

    if (page < 1 || page > totalPages) return reply(`Invalid page! Choose 1-${totalPages}`);

    const start = (page - 1) * itemsPerPage;
    const displayed = displayNames.slice(start, start + itemsPerPage);

    const menu = `𝐀𝐯𝐚𝐢𝐥𝐚𝐛𝐥𝐞 𝐀𝐥𝐛𝐮𝐦 𝐕𝐢𝐝𝐞𝐨 𝐋𝐢𝐬𝐭 🎀\n`
      + `𐙚━━━━━━━━━━━━━━━━━ᡣ𐭩\n`
      + displayed.map((name, i) => `${start + i + 1}. ${name}`).join("\n")
      + `\n𐙚━━━━━━━━━━━━━━━━━ᡣ𐭩\n`
      + `♻ | 𝐏𝐚𝐠𝐞 [${page}/${totalPages}]\n`
      + `ℹ | Reply with a number to get a video.`;

    const sent = await sock.sendMessage(chatId, { text: menu }, { quoted: event });

    global.NixBot.onReply.push({
      commandName: "album",
      messageID: sent.key.id,
      author: senderId,
      realCategories: categoriesInJson,
      displayNames: displayNames
    });
  },

  onReply: async function ({ sock, chatId, senderId, event }) {
    const quotedId = event.message?.extendedTextMessage?.contextInfo?.stanzaId;
    const data = global.NixBot.onReply.find(r => r.commandName === "album" && r.messageID === quotedId);
    if (!data) return;

    const senderClean = senderId.split(":")[0].split("@")[0];
    const authorClean = data.author.split(":")[0].split("@")[0];
    if (senderClean !== authorClean) return;

    const input = (event.message?.conversation || event.message?.extendedTextMessage?.text || "").trim();
    const choice = parseInt(input);

    if (isNaN(choice) || choice < 1 || choice > data.realCategories.length) {
      return sock.sendMessage(chatId, { text: "⚠️ Invalid choice. Reply with a valid number." }, { quoted: event });
    }

    const category = data.realCategories[choice - 1];
    const name = data.displayNames[choice - 1];

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const tempFile = path.join(cacheDir, `v_${Date.now()}.mp4`);

    try {
      let res;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await axios.get(`${aryan}/api/album/videos/${category}`, { timeout: 15000 });
          break;
        } catch (retryErr) {
          if (retryErr.response?.status === 429 && attempt < 2) {
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }
          throw retryErr;
        }
      }

      if (!res?.data?.success || !res.data.videos || !res.data.videos.length) {
        return sock.sendMessage(chatId, { text: "⚠️ No videos found in this category." }, { quoted: event });
      }

      const videoUrl = res.data.videos[Math.floor(Math.random() * res.data.videos.length)];

      const vidRes = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        timeout: 120000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      fs.writeFileSync(tempFile, Buffer.from(vidRes.data));

      await sock.sendMessage(chatId, {
        video: fs.readFileSync(tempFile),
        caption: `𝐇𝐞𝐫𝐞 𝐢𝐬 𝐲𝐨𝐮𝐫 ${name} ✨`,
        mimetype: "video/mp4"
      }, { quoted: event });

    } catch (e) {
      console.error("Album video error:", e.message);
      let errMsg = `❌ Error: ${e.message}`;
      if (e.response?.status === 429) errMsg = "⚠️ API rate limited, please try again in a few seconds.";
      sock.sendMessage(chatId, { text: errMsg }, { quoted: event });
    } finally {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) {}
      }
    }

    const idx = global.NixBot.onReply.findIndex(r => r.messageID === data.messageID);
    if (idx !== -1) global.NixBot.onReply.splice(idx, 1);
  }
};
