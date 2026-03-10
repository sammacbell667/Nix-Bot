const { getTime, uploadImage } = global.utils;
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
  config: {
    name: "setleave",
    aliases: ["setgoodbye", "setbye"],
    version: "0.0.2",
    author: "ArYAN",
    countDown: 5,
    role: 1,
    prefix: true,
    category: "group",
    description: "Set custom leave/remove message for group",
    guide: {
      en: "{pn} text <message> - Set custom leave message (when user leaves)"
        + "\n{pn} text reset - Reset leave message to default"
        + "\n{pn} remove <message> - Set custom remove message (when admin kicks)"
        + "\n{pn} remove reset - Reset remove message to default"
        + "\n{pn} image - Set leave/remove image (reply/send with image)"
        + "\n{pn} image reset - Remove leave/remove image"
        + "\n{pn} on - Turn on leave/remove message"
        + "\n{pn} off - Turn off leave/remove message"
        + "\n{pn} view - View current settings"
        + "\n\nShortcodes:"
        + "\n  {userName} - Member's name"
        + "\n  {userNameTag} - Member's name (with tag)"
        + "\n  {boxName} - Group name"
        + "\n  {member} - Member count"
        + "\n  {session} - Time of day"
        + "\n  {removedBy} - Admin who removed (remove only)"
        + "\n  {time} - Current time"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply, isGroup, threadsData }) {
    if (!isGroup) return reply("This command can only be used in groups.");

    const sub = args[0]?.toLowerCase();
    const threadData = await threadsData.get(chatId) || {};

    if (!sub) {
      let msg = "Leave/Remove Message Settings:\n\n";
      msg += "setleave text <message> - Set leave msg\n";
      msg += "setleave text reset - Reset leave msg\n";
      msg += "setleave remove <message> - Set remove msg\n";
      msg += "setleave remove reset - Reset remove msg\n";
      msg += "setleave image - Set image (reply/attach)\n";
      msg += "setleave image reset - Remove image\n";
      msg += "setleave on - Turn on\n";
      msg += "setleave off - Turn off\n";
      msg += "setleave view - View current\n\n";
      msg += "Shortcodes:\n";
      msg += "{userName} - Member name\n";
      msg += "{userNameTag} - Member name (tag)\n";
      msg += "{boxName} - Group name\n";
      msg += "{member} - Member count\n";
      msg += "{session} - Time of day\n";
      msg += "{removedBy} - Admin who removed\n";
      msg += "{time} - Current time";
      return reply(msg);
    }

    switch (sub) {
      case "text": {
        if (!args[1]) return reply("Please enter leave message content.");

        if (args[1].toLowerCase() === "reset") {
          await threadsData.set(chatId, { leaveMessage: null });
          return reply("Leave message has been reset to default.");
        }

        const body = (
          event.message?.conversation ||
          event.message?.extendedTextMessage?.text || ""
        ).trim();

        const cmdText = body.indexOf("text");
        const leaveMsg = body.slice(cmdText + 4).trim();

        if (!leaveMsg) return reply("Please enter leave message content.");

        await threadsData.set(chatId, { leaveMessage: leaveMsg, leaveEnabled: true });
        return reply(`Leave message set (when user leaves):\n\n${leaveMsg}`);
      }

      case "remove":
      case "kick": {
        if (!args[1]) return reply("Please enter remove message content.");

        if (args[1].toLowerCase() === "reset") {
          await threadsData.set(chatId, { removeMessage: null });
          return reply("Remove message has been reset to default.");
        }

        const body = (
          event.message?.conversation ||
          event.message?.extendedTextMessage?.text || ""
        ).trim();

        const cmdIdx = body.indexOf(sub);
        const removeMsg = body.slice(cmdIdx + sub.length).trim();

        if (!removeMsg) return reply("Please enter remove message content.");

        await threadsData.set(chatId, { removeMessage: removeMsg, leaveEnabled: true });
        return reply(`Remove message set (when admin kicks):\n\n${removeMsg}`);
      }

      case "image":
      case "img":
      case "pic":
      case "photo": {
        if (args[1]?.toLowerCase() === "reset") {
          await threadsData.set(chatId, { leaveImage: null });
          return reply("Leave/remove image has been removed.");
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
          await threadsData.set(chatId, { leaveImage: url });
          return reply("Leave/remove image has been set successfully.");
        } catch (e) {
          console.error("[SETLEAVE IMAGE ERROR]", e.message);
          return reply("❌ Failed to upload image. Please try again.");
        }
      }

      case "on": {
        await threadsData.set(chatId, { leaveEnabled: true });
        return reply("Turned on leave/remove message for this group.");
      }

      case "off": {
        await threadsData.set(chatId, { leaveEnabled: false });
        return reply("Turned off leave/remove message for this group.");
      }

      case "view": {
        const enabled = threadData.leaveEnabled !== false;
        const customLeave = threadData.leaveMessage || null;
        const customRemove = threadData.removeMessage || null;
        const hasImage = !!threadData.leaveImage;

        let msg = `Status: ${enabled ? "ON" : "OFF"}\n`;
        msg += `Image: ${hasImage ? "Set" : "None"}\n\n`;
        msg += `Leave Message (user leaves):\n`;
        msg += customLeave ? customLeave : "Default";
        msg += `\n\nRemove Message (admin kicks):\n`;
        msg += customRemove ? customRemove : "Default";

        if (hasImage) {
          try {
            const res = await require("axios").get(threadData.leaveImage, { responseType: "arraybuffer" });
            return await sock.sendMessage(chatId, { image: Buffer.from(res.data), caption: msg }, { quoted: event });
          } catch (e) {}
        }

        return reply(msg);
      }

      default: {
        return reply("Invalid option. Use: setleave text | remove | image | on | off | view");
      }
    }
  }
};
