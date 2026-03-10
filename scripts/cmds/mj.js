const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const { fetchImage } = global.utils;

module.exports = {
  config: {
    name: "mj",
    aliases: ["midjourney"],
    version: "0.0.4",
    author: "ArYAN",
    countDown: 10,
    role: 0,
    description: {
        en: "Generate AI images in Midjourney style"
    },
    category: "ai",
    guide: {
        en: "{pn} <prompt>"
    }
  },

  onStart: async function ({ sock, chatId, args, event, senderId, reply }) {
    const p = args.join(" ");
    if (!p) return reply("Please provide a prompt.");

    const wait = await sock.sendMessage(chatId, { text: "Generating 4 images, please wait..." }, { quoted: event });

    const tmpDir = path.join(__dirname, "cache");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    try {
      const baseApi = global.NixBot.apis.base;
      const apiUrl = `${baseApi}/aryan/Midjourney?prompt=${encodeURIComponent(p)}&apikey=aryannix`;

      const buffers = [];
      for (let i = 0; i < 4; i++) {
        const buf = await fetchImage(apiUrl);
        buffers.push(buf);
      }

      const canvas = createCanvas(1024, 1024);
      const ctx = canvas.getContext("2d");
      const images = await Promise.all(buffers.map(b => loadImage(b)));

      ctx.drawImage(images[0], 0, 0, 512, 512);
      ctx.drawImage(images[1], 512, 0, 512, 512);
      ctx.drawImage(images[2], 0, 512, 512, 512);
      ctx.drawImage(images[3], 512, 512, 512, 512);

      const gridPath = path.join(tmpDir, `mj_grid_${Date.now()}.png`);
      const gridBuffer = canvas.toBuffer("image/png");
      fs.writeFileSync(gridPath, gridBuffer);

      await sock.sendMessage(chatId, {
        image: fs.readFileSync(gridPath),
        caption: `🎨 *Midjourney*\n📝 Prompt: ${p}\n\nReply with 1-4 to get individual image`
      }, { quoted: event });

      global.NixBot.onReply.push({
        commandName: "mj",
        messageID: (await sock.sendMessage(chatId, { text: "" }))?.key?.id,
        author: senderId,
        buffers,
        prompt: p
      });

      try {
        await sock.sendMessage(chatId, { delete: wait.key });
      } catch (e) {}

      fs.unlinkSync(gridPath);

    } catch (e) {
      console.error("[MJ] Error:", e.message);
      try { await sock.sendMessage(chatId, { delete: wait.key }); } catch (err) {}
      reply("Error generating images: " + e.message);
    }
  },

  onReply: async function ({ sock, chatId, message, senderId, event }) {
    const repliedMsgId = event.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!repliedMsgId) return;

    const data = global.NixBot.onReply.find(r => r.commandName === "mj" && r.author === senderId);
    if (!data || !data.buffers) return;

    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
    const num = parseInt(text.trim());
    if (num < 1 || num > 4) return;

    const buf = data.buffers[num - 1];
    if (!buf) return;

    try {
      await sock.sendMessage(chatId, {
        image: buf,
        caption: `🎨 Image ${num}/4\n📝 ${data.prompt}`
      }, { quoted: event });
    } catch (e) {
      console.error("[MJ] Reply Error:", e.message);
    }
  }
};
