const { getTime, uploadImage } = global.utils;
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
  config: {
    name: "setwelcome",
    aliases: ["setwc"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 1,
    prefix: true,
    category: "group",
    description: "Set custom welcome message for group",
    guide: {
      en: "{pn} text <message> - Set custom welcome message"
        + "\n{pn} text reset - Reset to default"
        + "\n{pn} image - Set welcome image (reply/send with image)"
        + "\n{pn} image reset - Remove welcome image"
        + "\n{pn} on - Turn on welcome message"
        + "\n{pn} off - Turn off welcome message"
        + "\n{pn} view - View current welcome message"
        + "\n\nShortcodes:"
        + "\n  {userName} - New member's name"
        + "\n  {userNameTag} - New member's name (with tag)"
        + "\n  {boxName} - Group name"
        + "\n  {member} - Member count"
        + "\n  {session} - Time of day"
        + "\n  {addedBy} - Who added the member"
        + "\n  {time} - Current time"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply, isGroup, threadsData }) {
    if (!isGroup) return reply("This command can only be used in groups.");

    const sub = args[0]?.toLowerCase();
    const threadData = await threadsData.get(chatId) || {};

    if (!sub) {
      let msg = "Welcome Message Settings:\n\n";
      msg += "setwelcome text <message> - Set custom\n";
      msg += "setwelcome text reset - Reset to default\n";
      msg += "setwelcome image - Set image (reply/attach)\n";
      msg += "setwelcome image reset - Remove image\n";
      msg += "setwelcome on - Turn on\n";
      msg += "setwelcome off - Turn off\n";
      msg += "setwelcome view - View current\n\n";
      msg += "Shortcodes:\n";
      msg += "{userName} - Member name\n";
      msg += "{userNameTag} - Member name (tag)\n";
      msg += "{boxName} - Group name\n";
      msg += "{member} - Member count\n";
      msg += "{session} - Time of day\n";
      msg += "{addedBy} - Added by\n";
      msg += "{time} - Current time";
      return reply(msg);
    }

    switch (sub) {
      case "text": {
        if (!args[1]) return reply("Please enter welcome message content.");

        if (args[1].toLowerCase() === "reset") {
          await threadsData.set(chatId, { welcomeMessage: null });
          return reply("Welcome message has been reset to default.");
        }

        const body = (
          event.message?.conversation ||
          event.message?.extendedTextMessage?.text || ""
        ).trim();

        const cmdText = body.indexOf("text");
        const welcomeMsg = body.slice(cmdText + 4).trim();

        if (!welcomeMsg) return reply("Please enter welcome message content.");

        await threadsData.set(chatId, { welcomeMessage: welcomeMsg, welcomeEnabled: true });
        return reply(`Welcome message has been set:\n\n${welcomeMsg}`);
      }

      case "image":
      case "img":
      case "pic":
      case "photo": {
        if (args[1]?.toLowerCase() === "reset") {
          await threadsData.set(chatId, { welcomeImage: null });
          return reply("Welcome image has been removed.");
        }

        let imageBuffer = null;

        const imageMsg = event.message?.imageMessage;
        if (imageMsg) {
          const stream = await downloadContentFromMessage(imageMsg, "image");
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          imageBuffer = Buffer.concat(chunks);
        }

        if (!imageBuffer) {
          const contextInfo = event.message?.extendedTextMessage?.contextInfo;
          const quoted = contextInfo?.quotedMessage;
          const quotedImage = quoted?.imageMessage;
          if (quotedImage) {
            const stream = await downloadContentFromMessage(quotedImage, "image");
            const chunks = [];
            for await (const chunk of stream) chunks.push(chunk);
            imageBuffer = Buffer.concat(chunks);
          }
        }

        if (!imageBuffer) {
          return reply("Please send or reply to an image with this command.");
        }

        try {
          const url = await uploadImage(imageBuffer);
          await threadsData.set(chatId, { welcomeImage: url });
          return reply(`Welcome image has been set successfully.`);
        } catch (e) {
          console.error("[SETWELCOME IMAGE ERROR]", e.message);
          return reply("❌ Failed to upload image. Please try again.");
        }
      }

      case "on": {
        await threadsData.set(chatId, { welcomeEnabled: true });
        return reply("Turned on welcome message for this group.");
      }

      case "off": {
        await threadsData.set(chatId, { welcomeEnabled: false });
        return reply("Turned off welcome message for this group.");
      }

      case "view": {
        const enabled = threadData.welcomeEnabled !== false;
        const custom = threadData.welcomeMessage || null;
        const hasImage = !!threadData.welcomeImage;

        let msg = `Status: ${enabled ? "ON" : "OFF"}\n`;
        msg += `Image: ${hasImage ? "Set" : "None"}\n\n`;
        if (custom) {
          msg += `Custom Message:\n${custom}`;
        } else {
          msg += "Using default welcome message.";
        }

        if (hasImage) {
          try {
            const res = await require("axios").get(threadData.welcomeImage, { responseType: "arraybuffer" });
            return await sock.sendMessage(chatId, { image: Buffer.from(res.data), caption: msg }, { quoted: event });
          } catch (e) {}
        }

        return reply(msg);
      }

      default: {
        return reply("Invalid option. Use: setwelcome text <message> | image | on | off | view");
      }
    }
  }
};
