const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { getAvatar } = global.utils;

const cacheDir = path.join(__dirname, "cache");
const bgUrl = "https://i.postimg.cc/tRFY2HBm/0602f6fd6933805cf417774fdfab157e.jpg";

module.exports = {
  config: {
    name: "pair",
    aliases: [],
    version: "2.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    description: "Pair yourself with someone in the group",
    category: "fun",
    guide: {
      en: "{pn} - Random pair\n{pn} @mention - Pair with mentioned\nReply to a message with {pn} to pair with them"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, reply, isGroup }) {
    if (!isGroup) return reply("This command can only be used in groups.");

    let groupMeta;
    try {
      groupMeta = await sock.groupMetadata(chatId);
    } catch (e) {
      return reply("Failed to get group info.");
    }

    const participants = groupMeta.participants || [];
    if (participants.length < 2) return reply("Not enough members to pair!");

    const senderName = event.pushName || "Unknown";
    let partnerId = null;

    const msg = event.message || {};
    const contextInfo = msg?.extendedTextMessage?.contextInfo || {};
    const mentionedJid = contextInfo?.mentionedJid || [];

    if (mentionedJid.length > 0) {
      partnerId = mentionedJid[0];
    } else if (contextInfo?.stanzaId && contextInfo?.participant) {
      partnerId = contextInfo.participant;
    }

    if (partnerId) {
      const exists = participants.find(p => p.id === partnerId || p.phoneNumber === partnerId);
      if (!exists) partnerId = null;
    }

    if (!partnerId) {
      const senderNum = (senderId || "").split("@")[0];
      const others = participants.filter(p => {
        const pNum = (p.phoneNumber || p.id || "").split("@")[0];
        return pNum !== senderNum && p.id !== senderId;
      });
      if (others.length === 0) return reply("No one else in the group to pair with!");
      const random = others[Math.floor(Math.random() * others.length)];
      partnerId = random.phoneNumber || random.id;
    }

    const partnerNum = partnerId.split("@")[0];
    const senderNum = (senderId || "").split("@")[0];

    if (partnerNum === senderNum) return reply("You can't pair with yourself! 😉");

    const lovePercent = Math.floor(Math.random() * 31) + 70;

    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
    const cachePath = path.join(cacheDir, `pair_${Date.now()}.png`);

    try {
      const senderJid = senderId || `${senderNum}@s.whatsapp.net`;
      const partnerJid = partnerId.includes("@") ? partnerId : `${partnerNum}@s.whatsapp.net`;

      const [img1, img2, background] = await Promise.all([
        getAvatar(sock, senderJid),
        getAvatar(sock, partnerJid),
        (async () => {
          try {
            const res = await axios.get(bgUrl, { responseType: "arraybuffer", timeout: 15000 });
            return await loadImage(Buffer.from(res.data));
          } catch (e) {
            return null;
          }
        })()
      ]);

      const width = 800;
      const height = 400;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      if (background) {
        ctx.drawImage(background, 0, 0, width, height);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#1a1a2e");
        gradient.addColorStop(1, "#16213e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      if (img1) ctx.drawImage(img1, 385, 40, 170, 170);
      if (img2) ctx.drawImage(img2, width - 213, 190, 180, 170);

      const buffer = canvas.toBuffer("image/png");
      fs.writeFileSync(cachePath, buffer);

      const mentionJid = partnerJid;
      const caption = `🎉 𝗣𝗮𝗶𝗿 𝗦𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹!\n👩 ${senderName}\n👨 @${partnerNum}\n💘 𝗟𝗼𝘃𝗲 𝗣𝗲𝗿𝗰𝗲𝗻𝘁𝗮𝗴𝗲: ${lovePercent}% 💙\n💌 Wish you two endless happiness!`;

      await sock.sendMessage(chatId, {
        image: fs.readFileSync(cachePath),
        caption,
        mentions: [mentionJid]
      }, { quoted: event });

    } catch (e) {
      console.error("[PAIR] Error:", e.message);
      reply("An error occurred: " + e.message);
    } finally {
      if (fs.existsSync(cachePath)) {
        try { fs.unlinkSync(cachePath); } catch (e) {}
      }
    }
  }
};
