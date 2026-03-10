const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

const cacheDir = path.join(__dirname, "cache");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

module.exports = {
  config: {
    name: "notification",
    aliases: ["notify", "noti"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 10,
    role: 2,
    prefix: true,
    category: "owner",
    description: "Send notification from admin to all groups.",
    guide: {
      en: "{pn} <message> — Send text notification to all groups\nReply to an image/video with {pn} <message> — Send media notification"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply }) {
    if (!args.length) {
      return reply("Please enter the message you want to send to all groups");
    }

    const text = args.join(" ");
    const notifText = `Notification from admin bot to all chat groups (do not reply to this message)\n────────────────\n${text}`;

    const msg = event.message || {};
    const contextInfo = msg?.extendedTextMessage?.contextInfo || {};
    const quoted = contextInfo?.quotedMessage || {};

    const imageMsg = quoted?.imageMessage
      || quoted?.documentWithCaptionMessage?.message?.imageMessage
      || msg?.imageMessage
      || null;

    const videoMsg = quoted?.videoMessage || msg?.videoMessage || null;

    let mediaBuffer = null;
    let mediaType = null;

    if (imageMsg) {
      const stream = await downloadContentFromMessage(imageMsg, "image");
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      mediaBuffer = Buffer.concat(chunks);
      mediaType = "image";
    } else if (videoMsg) {
      const stream = await downloadContentFromMessage(videoMsg, "video");
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      mediaBuffer = Buffer.concat(chunks);
      mediaType = "video";
    }

    let allGroups;
    try {
      const groups = await sock.groupFetchAllParticipating();
      allGroups = Object.keys(groups);
    } catch (err) {
      console.error("[NOTI ERROR]", err.message);
      return reply("❌ Failed to fetch group list.");
    }

    if (!allGroups.length) {
      return reply("❌ No groups found.");
    }

    await reply(`Start sending notification from admin bot to ${allGroups.length} chat groups`);

    let success = 0;
    let failed = 0;

    for (const groupJid of allGroups) {
      try {
        let content;
        if (mediaBuffer && mediaType === "image") {
          content = { image: mediaBuffer, caption: notifText };
        } else if (mediaBuffer && mediaType === "video") {
          content = { video: mediaBuffer, caption: notifText };
        } else {
          content = { text: notifText };
        }
        await sock.sendMessage(groupJid, content);
        success++;
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        failed++;
      }
    }

    let result = "";
    if (success > 0) result += `✅ Sent notification to ${success} groups successfully`;
    if (failed > 0) result += `\nAn error occurred while sending to ${failed} groups`;

    return reply(result);
  }
};
