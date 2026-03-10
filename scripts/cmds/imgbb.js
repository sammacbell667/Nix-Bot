const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

module.exports = {
  config: {
    name: "imgbb",
    version: "1.0.0",
    author: "ArYAN",
    countDown: 0,
    role: 0,
    prefix: true,
    category: "utility",
    description: "Upload an image to ImgBB",
    guide: { en: "{pn} - Reply to an image or provide a URL" }
  },

  onStart: async function ({ sock, chatId, event, args, reply }) {
    const msg = event.message || {};
    const contextInfo = msg?.extendedTextMessage?.contextInfo
      || msg?.imageMessage?.contextInfo
      || msg?.videoMessage?.contextInfo
      || {};
    const quoted = contextInfo?.quotedMessage || {};

    const imageMsg = quoted?.imageMessage
      || quoted?.documentWithCaptionMessage?.message?.imageMessage
      || msg?.imageMessage
      || null;

    const urlArg = args[0] || null;

    if (!imageMsg && !urlArg) {
      return reply("❌ Please reply to an image or provide a URL.");
    }

    await sock.sendMessage(chatId, { react: { text: "⏳", key: event.key } });

    const apiKey = global.NixBot.keys.imgbb;

    try {
      let link;
      const form = new FormData();
      form.append("key", apiKey);

      if (imageMsg) {
        const stream = await downloadContentFromMessage(imageMsg, "image");
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        form.append("image", buffer.toString("base64"));
      } else {
        form.append("image", urlArg);
      }

      const res = await axios.post(global.NixBot.apis.imgbb, form, {
        headers: form.getHeaders(),
        timeout: 30000
      });

      link = res.data?.data?.url || res.data?.data?.display_url;

      if (!link) {
        await sock.sendMessage(chatId, { react: { text: "❌", key: event.key } });
        return reply("❌ Failed to upload to ImgBB.");
      }

      await sock.sendMessage(chatId, { react: { text: "✅", key: event.key } });
      return reply(link);

    } catch (err) {
      console.error("[IMGBB ERROR]", err.message);
      await sock.sendMessage(chatId, { react: { text: "❌", key: event.key } });
      return reply("⚠️ Failed to upload. Try again later.");
    }
  }
};
