const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { uploadImage } = global.utils;

const cacheDir = path.join(__dirname, "cache");

module.exports = {
  config: {
    name: "removebg",
    aliases: ["rbg"],
    version: "0.0.3",
    role: 0,
    author: "ArYAN",
    countDown: 5,
    category: "utility",
    description: "Remove background from an image",
    guide: {
      en: "{pn} - Reply to an image to remove its background."
    }
  },

  onStart: async function ({ sock, chatId, event, reply }) {
    const msg = event.message || {};
    const contextInfo = msg?.extendedTextMessage?.contextInfo
      || msg?.imageMessage?.contextInfo
      || msg?.videoMessage?.contextInfo
      || msg?.buttonsResponseMessage?.contextInfo
      || msg?.templateButtonReplyMessage?.contextInfo
      || {};
    const quoted = contextInfo?.quotedMessage || {};

    const imageMsg = quoted?.imageMessage
      || quoted?.documentWithCaptionMessage?.message?.imageMessage
      || msg?.imageMessage
      || null;

    if (!imageMsg) {
      return reply("Please reply to an image to remove its background.");
    }

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const cachePath = path.join(cacheDir, `rbg_${Date.now()}.png`);

    try {
      const baseApi = global.NixBot.apis.base;

      await sock.sendMessage(chatId, { react: { text: "⏳", key: event.key } });

      const stream = await downloadContentFromMessage(imageMsg, "image");
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      if (!buffer || buffer.length < 100) throw new Error("Failed to download image.");

      const imageUrl = await uploadImage(buffer);

      const response = await axios.get(`${baseApi}/aryan/rbg`, {
        params: { imageUrl },
        timeout: 60000
      });

      const resultUrl = response.data.result || response.data.enhancedImageUrl || response.data.url;
      if (!resultUrl) throw new Error("API did not return a result.");

      const resultImg = await axios.get(resultUrl, {
        responseType: "arraybuffer",
        timeout: 60000
      });
      fs.writeFileSync(cachePath, Buffer.from(resultImg.data));

      await sock.sendMessage(chatId, {
        image: fs.readFileSync(cachePath),
        caption: "Background removed successfully!"
      }, { quoted: event });

      await sock.sendMessage(chatId, { react: { text: "✅", key: event.key } });

    } catch (e) {
      console.error("[RBG] Error:", e.message);
      await sock.sendMessage(chatId, { react: { text: "❌", key: event.key } });
      reply(`Error: ${e.message}`);
    } finally {
      if (fs.existsSync(cachePath)) {
        try { fs.unlinkSync(cachePath); } catch (e) {}
      }
    }
  }
};
