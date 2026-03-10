const axios = require("axios");
const { usersData } = global.utils;

const FLAG_API = global.NixBot.apis.flag + "/flagGame?type=random";
const REWARD = 50;

module.exports = {
  config: {
    name: "flag",
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    prefix: true,
    category: "game",
    description: "Guess the country from its flag to earn coins",
    guide: {
      en: "{pn} - Bot sends a flag image, reply with the country name to win coins"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, reply }) {
    let apiData;
    try {
      const res = await axios.get(FLAG_API, { timeout: 15000 });
      apiData = res.data;
    } catch (e) {
      console.error("[FLAG] API error:", e.message);
      return reply("Failed to fetch flag. Try again.");
    }

    if (!apiData || !apiData.country || !apiData.image) {
      return reply("Failed to get flag data. Try again.");
    }

    let imgBuffer;
    try {
      const imgRes = await axios.get(apiData.image, { responseType: "arraybuffer", timeout: 15000 });
      imgBuffer = Buffer.from(imgRes.data);
    } catch (e) {
      console.error("[FLAG] Image fetch error:", e.message);
      return reply("Failed to load flag image. Try again.");
    }

    const sent = await sock.sendMessage(chatId, {
      image: imgBuffer,
      caption: "Which country's flag is this?\nReply with the country name to win $" + REWARD + "!"
    }, { quoted: event });

    const answer = apiData.country.trim().toLowerCase();

    global.NixBot.onReply.push({
      commandName: "flag",
      messageID: sent.key.id,
      author: senderId,
      answer: answer,
      displayName: apiData.country.trim(),
      flagImage: apiData.image
    });
  },

  onReply: async function ({ sock, chatId, message, senderId, event }) {
    const repliedMsgId = event.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!repliedMsgId) return;

    const data = global.NixBot.onReply.find(
      r => r.commandName === "flag" && r.messageID === repliedMsgId
    );
    if (!data) return;

    const text = (message.message?.conversation || message.message?.extendedTextMessage?.text || "").trim().toLowerCase();
    if (!text) return;

    const isCorrect = text === data.answer || data.answer.includes(text) || text.includes(data.answer);

    if (isCorrect) {
      const idx = global.NixBot.onReply.findIndex(r => r.commandName === "flag" && r.messageID === data.messageID);
      if (idx !== -1) global.NixBot.onReply.splice(idx, 1);

      const userData = await usersData.get(senderId) || {};
      const currentMoney = Number(userData.money) || 0;
      await usersData.set(senderId, {
        money: currentMoney + REWARD,
        name: event.pushName || userData.name || "User"
      });

      try {
        const imgRes = await axios.get(data.flagImage, { responseType: "arraybuffer", timeout: 15000 });
        await sock.sendMessage(chatId, {
          image: Buffer.from(imgRes.data),
          caption: `Correct! The answer is ${data.displayName}.\n\nYou earned $${REWARD}!\nYour balance: $${(currentMoney + REWARD).toLocaleString()}`
        }, { quoted: event });
      } catch (e) {
        await sock.sendMessage(chatId, {
          text: `Correct! The answer is ${data.displayName}.\n\nYou earned $${REWARD}!\nYour balance: $${(currentMoney + REWARD).toLocaleString()}`
        }, { quoted: event });
      }
    } else {
      await sock.sendMessage(chatId, {
        text: "Wrong answer! Try again.",
      }, { quoted: event });
    }
  }
};
