const axios = require("axios");
const { downloadContentFromMessage, downloadMediaMessage } = require("@whiskeysockets/baileys");
const { uploadImage } = global.utils;

module.exports = {
  config: {
    name: "gemini",
    aliases: ["ai", "chat"],
    version: "0.0.3",
    author: "ArYAN",
    countDown: 3,
    role: 0,
    description: {
      en: "Ask Gemini AI (Text or Image)"
    },
    category: "AI",
    guide: {
      en: "{pn} [your question] (Reply to an image to use Vision)"
    }
  },

  onStart: async function ({ sock, chatId, args, event, senderId, reply }) {
    const p = args.join(" ");
    if (!p) return reply("Please provide a question or prompt.");

    await sock.sendMessage(chatId, { react: { text: "⏳", key: event.key } });

    const baseApi = global.NixBot.apis.base;

    const contextInfo = event.message?.extendedTextMessage?.contextInfo;
    const quoted = contextInfo?.quotedMessage;
    const imageMsg = quoted?.imageMessage
      || quoted?.documentWithCaptionMessage?.message?.imageMessage
      || quoted?.viewOnceMessageV2?.message?.imageMessage
      || event.message?.imageMessage
      || null;

    try {
      let apiUrl;

      if (imageMsg) {
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
              id: contextInfo?.stanzaId,
              participant: contextInfo?.participant,
              fromMe: false
            },
            message: quoted
          };
          buffer = await downloadMediaMessage(quotedMsgObj, "buffer", {});
        }

        if (!buffer || buffer.length < 100) throw new Error("Failed to download image.");

        const imageUrl = await uploadImage(buffer);
        apiUrl = `${baseApi}/aryan/gemini-pro?prompt=${encodeURIComponent(p)}&url=${encodeURIComponent(imageUrl)}`;
      } else {
        apiUrl = `${baseApi}/aryan/gemini?prompt=${encodeURIComponent(p)}`;
      }

      const r = await axios.get(apiUrl, { timeout: 60000 });
      const resMsg = r.data?.response;
      if (!resMsg) throw new Error("No response from Gemini.");

      await sock.sendMessage(chatId, { react: { text: "✅", key: event.key } });
      const sent = await sock.sendMessage(chatId, { text: resMsg }, { quoted: event });

      global.NixBot.onReply.push({
        commandName: "gemini",
        messageID: sent.key.id,
        author: senderId
      });

    } catch (e) {
      console.error("[GEMINI] Error:", e.message);
      await sock.sendMessage(chatId, { react: { text: "❌", key: event.key } });
      reply("Error: " + e.message);
    }
  },

  onReply: async function ({ sock, chatId, message, senderId, event }) {
    const repliedMsgId = event.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!repliedMsgId) return;
    const data = global.NixBot.onReply.find(r => r.commandName === "gemini" && r.author === senderId && r.messageID === repliedMsgId);
    if (!data) return;

    const p = message.message?.conversation || message.message?.extendedTextMessage?.text;
    if (!p) return;

    await sock.sendMessage(chatId, { react: { text: "⏳", key: event.key } });

    try {
      const baseApi = global.NixBot.apis.base;
      const r = await axios.get(`${baseApi}/aryan/gemini?prompt=${encodeURIComponent(p)}`, { timeout: 60000 });

      const resMsg = r.data?.response;
      if (!resMsg) throw new Error("No response from Gemini.");

      await sock.sendMessage(chatId, { react: { text: "✅", key: event.key } });
      const sent = await sock.sendMessage(chatId, { text: resMsg }, { quoted: event });

      const oldIdx = global.NixBot.onReply.findIndex(r => r.messageID === data.messageID);
      if (oldIdx !== -1) global.NixBot.onReply.splice(oldIdx, 1);

      global.NixBot.onReply.push({
        commandName: "gemini",
        messageID: sent.key.id,
        author: senderId
      });
    } catch (e) {
      console.error("[GEMINI] Reply Error:", e.message);
      await sock.sendMessage(chatId, { react: { text: "❌", key: event.key } });
      sock.sendMessage(chatId, { text: "Error: " + e.message });
    }
  }
};
