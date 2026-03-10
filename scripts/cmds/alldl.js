const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports = {
  config: {
    name: "alldl",
    version: "1.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    shortDescription: "High-speed multi-platform downloader",
    category: "media"
  },

  onStart: async function ({ sock, chatId, message }) {
    return sock.sendMessage(chatId, { text: "🚀 High-Speed AutoLink is active. Just paste any link!" }, { quoted: message });
  },

  onChat: async function ({ sock, chatId, message, event }) {
    const body = (event.message?.conversation || event.message?.extendedTextMessage?.text || "").trim();
    if (!body) return;

    const prefix = global.NixBot?.config?.prefix || "!";
    if (body.startsWith(prefix)) return;

    const match = body.match(/(https?:\/\/[^\s]+)/);
    if (!match) return;

    const url = match[0];
    const cacheDir = path.join(process.cwd(), "scripts", "cmds", "temp");
    const filePath = path.join(cacheDir, `dl_${Date.now()}.mp4`);

    try {
      const apiUrl = `https://aryan-autodl.vercel.app/alldl?url=${encodeURIComponent(url)}`;

      const response = await axios.get(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://www.google.com/"
        },
        timeout: 15000
      });

      const resData = response.data;
      if (resData.status && resData.downloadUrl) {
        // Send initial reaction
        try { await sock.sendMessage(chatId, { react: { text: "⏳", key: event.key } }); } catch (e) {}

        if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);

        const videoRes = await axios({
          method: 'get',
          url: resData.downloadUrl,
          responseType: 'arraybuffer',
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            "Referer": "https://www.google.com/",
            "Accept": "*/*",
            "Range": "bytes=0-"
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 120000,
          validateStatus: false
        });

        fs.writeFileSync(filePath, Buffer.from(videoRes.data));

        let platform = "Social Media";
        if (/facebook\.com|fb\.watch/i.test(url)) platform = "Facebook";
        else if (/tiktok\.com/i.test(url)) platform = "TikTok";
        else if (/instagram\.com/i.test(url)) platform = "Instagram";
        else if (/youtube\.com|youtu\.be/i.test(url)) platform = "YouTube";
        else if (/twitter\.com|x\.com/i.test(url)) platform = "Twitter/X";

        await sock.sendMessage(chatId, {
          video: fs.readFileSync(filePath),
          caption: `• Title: ${resData.title || "No Title"}\n• Platform: ${platform}`,
          mimetype: 'video/mp4'
        }, { quoted: event });

        // Send success reaction
        try { await sock.sendMessage(chatId, { react: { text: "✅", key: event.key } }); } catch (e) {}

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Download Error:", err);
      // Send error reaction
      try { await sock.sendMessage(chatId, { react: { text: "❌", key: event.key } }); } catch (e) {}
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
};