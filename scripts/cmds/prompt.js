const axios = require("axios");
const { downloadContentFromMessage, downloadMediaMessage } = require("@whiskeysockets/baileys");
const { uploadImage } = global.utils;

module.exports = {
  config: {
    name: "prompt",
    aliases: ["p"],
    version: "0.0.5",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    description: {
      en: "Generate Midjourney prompt from image"
    },
    category: "ai",
    guide: {
      en: "Reply to an image to generate Midjourney prompt"
    }
  },

  onStart: async function ({ sock, chatId, event, reply }) {
    const contextInfo = event.message?.extendedTextMessage?.contextInfo;
    const quoted = contextInfo?.quotedMessage;

    if (!quoted) return reply("📸 Please reply to an image.");

    const imageMsg = quoted.imageMessage
      || quoted.documentWithCaptionMessage?.message?.imageMessage
      || quoted.viewOnceMessageV2?.message?.imageMessage
      || null;

    if (!imageMsg) return reply("📸 Please reply to an image.");

    try {
      await sock.sendMessage(chatId, { react: { text: "⏰", key: event.key } });

      let buffer;
      try {
        const stream = await downloadContentFromMessage(imageMsg, "image");
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        buffer = Buffer.concat(chunks);
      } catch (e1) {
        const quotedMsgObj = {
          key: {
            remoteJid: chatId,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant,
            fromMe: false
          },
          message: quoted
        };
        buffer = await downloadMediaMessage(quotedMsgObj, "buffer", {});
      }

      if (!buffer || buffer.length < 100) throw new Error("Failed to download image.");

      const imageUrl = await uploadImage(buffer);

      const baseApi = global.NixBot.apis.base;

      const response = await axios.get(`${baseApi}/aryan/promptv2`, {
        params: { imageUrl },
        timeout: 60000
      });

      const result = response.data;
      if (!result.success) throw new Error(result.message || "Prompt API failed.");

      await reply(result.prompt || "No prompt returned.");
      await sock.sendMessage(chatId, { react: { text: "✅", key: event.key } });

    } catch (e) {
      console.error("[PROMPT] Error:", e.message);
      await sock.sendMessage(chatId, { react: { text: "❌", key: event.key } });
      reply(`❌ Error: ${e.message}`);
    }
  }
};
