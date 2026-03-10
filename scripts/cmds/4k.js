const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { uploadImage } = global.utils;

const cacheDir = path.join(__dirname, "cache");

module.exports = {
    config: {
        name: "4k",
        aliases: ["upscale"],
        version: "1.5",
        role: 0,
        author: "ArYAN",
        countDown: 10,
        description: "Upscale images to 4K resolution.",
        category: "image",
        guide: {
            en: "{pn} - Reply to an image to upscale it to 4K."
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
            return reply("Please reply to an image to upscale it!");
        }

        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        const cachePath = path.join(cacheDir, `upscale_${Date.now()}.png`);
        let processingMsg;

        try {
            const baseApi = global.NixBot.apis.base;

            const waitMsg = await sock.sendMessage(chatId, { text: "Processing your image to 4K, please wait..." }, { quoted: event });
            processingMsg = waitMsg.key;

            const stream = await downloadContentFromMessage(imageMsg, "image");
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);

            if (!buffer || buffer.length < 100) throw new Error("Failed to download image.");

            const imageUrl = await uploadImage(buffer);

            const response = await axios.get(`${baseApi}/aryan/4k`, {
                params: { imageUrl },
                timeout: 120000
            });

            if (!response.data.status) throw new Error(response.data.message || "API Error");

            const enhancedImg = await axios.get(response.data.enhancedImageUrl, {
                responseType: "arraybuffer",
                timeout: 60000
            });
            fs.writeFileSync(cachePath, Buffer.from(enhancedImg.data));

            await sock.sendMessage(chatId, {
                image: fs.readFileSync(cachePath),
                caption: "Your 4K upscaled image is ready!"
            }, { quoted: event });

        } catch (e) {
            console.error("[4K] Error:", e.message);
            reply(`Error: ${e.message}`);
        } finally {
            if (processingMsg) {
                try { await sock.sendMessage(chatId, { delete: processingMsg }); } catch (e) {}
            }
            if (fs.existsSync(cachePath)) {
                try { fs.unlinkSync(cachePath); } catch (e) {}
            }
        }
    }
};
