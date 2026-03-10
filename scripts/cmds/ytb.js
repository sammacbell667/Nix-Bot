const yts = require("yt-search");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const nixConfig = global.NixBot.apis.nixConfig;

module.exports = {
  config: {
    name: "youtube",
    aliases: ["ytb"],
    version: "1.2.0",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    category: "media",
    description: {
      en: "Search and download YouTube video or audio"
    },
    guide: {
      en: "{pn} -v [query/url] (for video)\n{pn} -a [query/url] (for audio)"
    }
  },

  onStart: async function ({ sock, chatId, args, event, senderId, reply, prefix, commandName }) {
    const type = args[0]?.toLowerCase();
    if (!["-v", "-a"].includes(type)) return reply(`Usage: ${prefix}${commandName} [-v|-a] <query/url>`);

    const query = args.slice(1).join(" ");
    if (!query) return reply("Please provide a search query or link.");

    if (query.startsWith("http")) {
      const wait = await sock.sendMessage(chatId, { text: "Downloading, please wait..." }, { quoted: event });
      await downloadMedia(query, type === "-v" ? "mp4" : "mp3", sock, chatId, event);
      try { await sock.sendMessage(chatId, { delete: wait.key }); } catch (e) {}
      return;
    }

    try {
      const search = await yts(query);
      const results = search.videos.slice(0, 6);
      if (results.length === 0) return reply("No results found.");

      let msg = "YouTube Search Results:\n\n";
      results.forEach((v, i) => {
        msg += `${i + 1}. ${v.title}\n   Duration: ${v.timestamp}\n\n`;
      });
      msg += "Reply with the number (1-6) to download.";

      const sent = await sock.sendMessage(chatId, {
        image: { url: results[0].thumbnail },
        caption: msg
      }, { quoted: event });

      global.NixBot.onReply.push({
        commandName: "youtube",
        messageID: sent.key.id,
        author: senderId,
        results: results,
        downloadType: type
      });

    } catch (err) {
      console.error("[YTB] Search error:", err.message);
      return reply("Search failed: " + err.message);
    }
  },

  onReply: async function ({ sock, chatId, message, senderId, event }) {
    const repliedMsgId = event.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!repliedMsgId) return;

    const data = global.NixBot.onReply.find(
      r => r.commandName === "youtube" && r.author === senderId && r.messageID === repliedMsgId
    );
    if (!data) return;

    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
    const index = parseInt(text) - 1;
    if (isNaN(index) || index < 0 || index >= data.results.length) return;

    const selected = data.results[index];

    const idx = global.NixBot.onReply.findIndex(r => r.messageID === data.messageID);
    if (idx !== -1) global.NixBot.onReply.splice(idx, 1);

    try {
      await sock.sendMessage(chatId, {
        delete: {
          remoteJid: chatId,
          fromMe: true,
          id: data.messageID
        }
      });
    } catch (e) {}

    const wait = await sock.sendMessage(chatId, { text: `Downloading: ${selected.title}...` }, { quoted: event });
    await downloadMedia(selected.url, data.downloadType === "-v" ? "mp4" : "mp3", sock, chatId, event);
    try { await sock.sendMessage(chatId, { delete: wait.key }); } catch (e) {}
  }
};

async function downloadMedia(url, format, sock, chatId, event) {
  const tmpDir = path.join(__dirname, "cache");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  try {
    let configRes;
    try {
      configRes = await axios.get(nixConfig, { timeout: 10000 });
    } catch (e) {
      throw new Error("Failed to fetch API config.");
    }
    const apiData = configRes.data;
    const baseApi = apiData.api;
    const nixtubeApi = apiData.nixtube;

    let apiUrl;
    if (format === "mp3") {
      apiUrl = `${baseApi}/play?url=${encodeURIComponent(url)}`;
    } else {
      apiUrl = `${nixtubeApi}?url=${encodeURIComponent(url)}&type=mp4`;
    }

    const { data } = await axios.get(apiUrl, { timeout: 30000 });
    const downloadUrl = data.downloadUrl || data.download_url;
    if (!downloadUrl) throw new Error("No download URL returned.");

    const filePath = path.join(tmpDir, `ytb_${Date.now()}.${format}`);
    const response = await axios.get(downloadUrl, { responseType: "arraybuffer", timeout: 120000 });
    fs.writeFileSync(filePath, Buffer.from(response.data));

    if (format === "mp3") {
      await sock.sendMessage(chatId, {
        audio: fs.readFileSync(filePath),
        mimetype: "audio/mpeg",
        fileName: `${data.title || "audio"}.mp3`,
        ptt: false
      }, { quoted: event });
    } else {
      await sock.sendMessage(chatId, {
        video: fs.readFileSync(filePath),
        caption: data.title || "Downloaded by NixBot",
        mimetype: "video/mp4"
      }, { quoted: event });
    }

    try { fs.unlinkSync(filePath); } catch (e) {}

  } catch (err) {
    console.error("[YTB] Download error:", err.message);
    await sock.sendMessage(chatId, { text: "Download failed: " + err.message }, { quoted: event });
  }
}
