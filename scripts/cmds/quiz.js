const axios = require("axios");

const QUIZ_API = "https://nix-quizz.vercel.app";

module.exports = {
  config: {
    name: "quiz",
    aliases: ["qz"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 0,
    role: 0,
    category: "game",
    nixPrefix: true,
    description: {
      en: "Play a quiz game and earn coins"
    },
    guide: {
      en: "{pn} <bn/en>\nExample: {pn} bn"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, usersData, args, reply }) {
    const available = ["bangla", "english"];
    let category;

    if (!args[0]) {
      category = available[Math.floor(Math.random() * available.length)];
    } else {
      const input = args[0].toLowerCase();
      if (input === "bn" || input === "bangla") category = "bangla";
      else if (input === "en" || input === "english") category = "english";
      else return reply("❌ | Invalid category\nAvailable: bangla, english");
    }

    try {
      const r = await axios.get(`${QUIZ_API}/quiz?category=${category}&q=random`, { timeout: 15000 });
      const q = r.data.question;
      const { question, correctAnswer, options } = q;
      const { a: oA, b: oB, c: oC, d: oD } = options;

      let correctLetter = "";
      if (oA === correctAnswer) correctLetter = "a";
      else if (oB === correctAnswer) correctLetter = "b";
      else if (oC === correctAnswer) correctLetter = "c";
      else if (oD === correctAnswer) correctLetter = "d";

      const msg = `\n╭──✦ ${question}\n├‣ 𝐀• ${oA}\n├‣ 𝐁• ${oB}\n├‣ 𝐂• ${oC}\n├‣ 𝐃• ${oD}\n╰──────────────‣\nReply with your answer\n➜ A B C D`;

      const sent = await sock.sendMessage(chatId, { text: msg }, { quoted: event });

      global.NixBot.onReply.push({
        commandName: "quiz",
        messageID: sent.key.id,
        author: senderId,
        correctAnswer,
        correctLetter,
        options: { a: oA, b: oB, c: oC, d: oD },
        nameUser: event.pushName || "User",
        attempts: 0,
        maxAttempts: 2
      });

    } catch (e) {
      console.error("[QUIZ] Error:", e.message);
      return reply("[⚜️]➜ 𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐟𝐞𝐭𝐜𝐡 𝐪𝐮𝐢𝐳. 𝐓𝐫𝐲 𝐚𝐠𝐚𝐢𝐧 𝐥𝐚𝐭𝐞𝐫.");
    }
  },

  onReply: async function ({ sock, chatId, message, senderId, event, usersData }) {
    const repliedMsgId = event.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!repliedMsgId) return;

    const dataIndex = global.NixBot.onReply.findIndex(
      r => r.commandName === "quiz" && r.messageID === repliedMsgId
    );
    if (dataIndex === -1) return;

    const data = global.NixBot.onReply[dataIndex];

    if (senderId !== data.author) {
      return sock.sendMessage(chatId, { text: "❌ 𝐎𝐧𝐥𝐲 𝐭𝐡𝐞 𝐨𝐫𝐢𝐠𝐢𝐧𝐚𝐥 𝐩𝐥𝐚𝐲𝐞𝐫 𝐜𝐚𝐧 𝐚𝐧𝐬𝐰𝐞𝐫 𝐭𝐡𝐢𝐬 𝐪𝐮𝐢𝐳." }, { quoted: event });
    }

    const rawAnswer = (message.message?.conversation || message.message?.extendedTextMessage?.text || "").trim().toLowerCase();

    let isCorrect = false;
    if (["a", "b", "c", "d"].includes(rawAnswer)) {
      isCorrect = rawAnswer === data.correctLetter;
    } else {
      isCorrect = rawAnswer === data.correctAnswer.toLowerCase();
    }

    if (isCorrect) {
      global.NixBot.onReply.splice(dataIndex, 1);
      try {
        await sock.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: true, id: data.messageID } });
      } catch (e) {}

      const coins = 300;
      const exp = 100;
      const userData = await usersData.get(senderId);
      const currentMoney = Number(userData.money) || 0;
      const currentExp = Number(userData.exp) || 0;

      await usersData.set(senderId, {
        money: currentMoney + coins,
        exp: currentExp + exp
      });

      return sock.sendMessage(chatId, {
        text: `🎉 𝐂𝐨𝐧𝐠𝐫𝐚𝐭𝐮𝐥𝐚𝐭𝐢𝐨𝐧𝐬 🎉\n👤𝐍𝐚𝐦𝐞: ${data.nameUser}\n You answered correctly.\n💰 𝐂𝐨𝐢𝐧𝐬: +${coins}\n🌟 𝐄𝐗𝐏: +${exp}`
      }, { quoted: event });
    }

    data.attempts += 1;

    if (data.attempts >= data.maxAttempts) {
      global.NixBot.onReply.splice(dataIndex, 1);
      try {
        await sock.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: true, id: data.messageID } });
      } catch (e) {}
      return sock.sendMessage(chatId, {
        text: `[⭕]➜ ${data.nameUser} 𝐲𝐨𝐮 𝐡𝐚𝐯𝐞 𝐫𝐞𝐚𝐜𝐡𝐞𝐝 𝐭𝐡𝐞 𝐦𝐚𝐱𝐢𝐦𝐮𝐦 𝐚𝐭𝐭𝐞𝐦𝐩𝐭𝐬 (${data.maxAttempts}).\n✅ | Correct answer: ${data.correctAnswer}`
      }, { quoted: event });
    }

    global.NixBot.onReply[dataIndex] = data;
    return sock.sendMessage(chatId, {
      text: `[❌]➜ 𝐖𝐫𝐨𝐧𝐠 𝐚𝐧𝐬𝐰𝐞𝐫 𝐀𝐭𝐭𝐞𝐦𝐩𝐭𝐬 𝐥𝐞𝐟𝐭: ${data.maxAttempts - data.attempts}`
    }, { quoted: event });
  }
};
