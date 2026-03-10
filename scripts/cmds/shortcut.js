const { threadsData, drive, getStreamFromURL, getExtFromUrl } = global.utils;
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
  config: {
    name: "shortcut",
    aliases: ["short"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    prefix: true,
    category: "custom",
    description: "Add a shortcut for your message in group chat",
    guide: {
      en: "{pn} add <word> => <reply> - Add a shortcut (can attach image/video/audio)"
        + "\n   Example: {pn} add hi => Hello everyone"
        + "\n\n{pn} del <word> - Delete a shortcut"
        + "\n   Example: {pn} del hi"
        + "\n\n{pn} remove - Remove all shortcuts"
        + "\n\n{pn} list - View all shortcuts"
        + "\n{pn} list start <keyword> - Shortcuts starting with keyword"
        + "\n{pn} list end <keyword> - Shortcuts ending with keyword"
        + "\n{pn} list contain <keyword> - Shortcuts containing keyword"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply, isGroup, senderId }) {
    if (!isGroup) return reply("This command can only be used in groups.");

    const threadData = await threadsData.get(chatId) || {};
    const shortcuts = threadData.shortcuts || [];

    switch (args[0]) {
      case "add": {
        const body = (
          event.message?.conversation ||
          event.message?.extendedTextMessage?.text ||
          event.message?.imageMessage?.caption ||
          event.message?.videoMessage?.caption || ""
        ).trim();

        const addIdx = body.toLowerCase().indexOf("add");
        const afterAdd = body.slice(addIdx + 3).trim();
        const parts = afterAdd.split("=>");

        const key = (parts[0] || "").trim().toLowerCase();
        const content = (parts.slice(1).join("=>") || "").trim();

        let attachmentIds = [];
        attachmentIds = await saveAttachments(event, chatId, senderId);

        if (!key || (!content && attachmentIds.length === 0)) {
          return reply("Please enter the message content.\nFormat: shortcut add <word> => <reply>");
        }

        const existing = shortcuts.find(s => s.key === key);
        if (existing) {
          if (existing.author === senderId) {
            if (existing.attachments?.length) {
              for (const aid of existing.attachments) {
                try { await drive.deleteFile(aid); } catch (e) {}
              }
            }
            existing.content = content;
            existing.attachments = attachmentIds;
            await threadsData.set(chatId, { shortcuts });
            let msg = `Updated shortcut "${key}" => ${content}`;
            if (attachmentIds.length) msg += ` with ${attachmentIds.length} attachment(s)`;
            return reply(msg);
          }
          return reply(`Shortcut "${key}" has been added by other member, please try another keyword.`);
        }

        shortcuts.push({ key, content, attachments: attachmentIds, author: senderId });
        await threadsData.set(chatId, { shortcuts });
        let msg = `Added shortcut "${key}" => ${content}`;
        if (attachmentIds.length) msg += ` with ${attachmentIds.length} attachment(s)`;
        return reply(msg);
      }

      case "del":
      case "delete": {
        const key = args.slice(1).join(" ").trim().toLowerCase();
        if (!key) return reply("Please enter the keyword of the shortcut you want to delete.");

        const index = shortcuts.findIndex(s => s.key === key);
        if (index === -1) return reply(`No shortcut found for keyword "${key}" in your group chat.`);

        const isAdmin = await checkAdmin(sock, chatId, senderId);
        if (shortcuts[index].author !== senderId && !isAdmin) {
          return reply("Only administrators can delete other people's shortcuts.");
        }

        if (shortcuts[index].attachments?.length) {
          for (const aid of shortcuts[index].attachments) {
            try { await drive.deleteFile(aid); } catch (e) {}
          }
        }

        shortcuts.splice(index, 1);
        await threadsData.set(chatId, { shortcuts });
        return reply(`Deleted shortcut "${key}"`);
      }

      case "list": {
        if (!shortcuts.length) return reply("Your group chat has not added any shortcuts.");

        let filtered = shortcuts;
        let title = "Your shortcuts list";

        if (args[1]) {
          const filterType = args[1].toLowerCase();
          const keyword = args.slice(2).join(" ").toLowerCase();

          if (filterType === "start") {
            filtered = shortcuts.filter(s => s.key.startsWith(keyword));
            title = `Shortcuts starting with "${keyword}"`;
            if (!filtered.length) return reply(`Your group has no shortcuts starting with "${keyword}"`);
          } else if (filterType === "end") {
            filtered = shortcuts.filter(s => s.key.endsWith(keyword));
            title = `Shortcuts ending with "${keyword}"`;
            if (!filtered.length) return reply(`Your group has no shortcuts ending with "${keyword}"`);
          } else if (["contain", "has", "have", "include", "in"].includes(filterType)) {
            filtered = shortcuts.filter(s => s.key.includes(keyword));
            title = `Shortcuts containing "${keyword}"`;
            if (!filtered.length) return reply(`Your group has no shortcuts containing "${keyword}"`);
          } else {
            filtered = shortcuts.filter(s => s.key.startsWith(filterType));
            title = `Shortcuts starting with "${filterType}"`;
            if (!filtered.length) return reply(`Your group has no shortcuts starting with "${filterType}"`);
          }
        }

        let msg = title + "\n";
        filtered.forEach((s, i) => {
          const msgPart = s.content ? "1 Message" : "";
          const attPart = s.attachments?.length ? `${s.attachments.length} Attachment` : "";
          const parts = [msgPart, attPart].filter(Boolean).join(", ");
          msg += `\n[${i + 1}] ${s.key} => ${parts}`;
        });
        return reply(msg);
      }

      case "remove":
      case "reset":
      case "rm":
      case "-rm": {
        const isAdmin = await checkAdmin(sock, chatId, senderId);
        if (!isAdmin) return reply("Only administrators can remove all shortcuts in the group chat.");

        if (!shortcuts.length) return reply("Your group chat has not added any shortcuts.");

        for (const s of shortcuts) {
          if (s.attachments?.length) {
            for (const aid of s.attachments) {
              try { await drive.deleteFile(aid); } catch (e) {}
            }
          }
        }

        await threadsData.set(chatId, { shortcuts: [] });
        return reply("Removed all shortcuts in your group chat.");
      }

      default:
        return reply("Invalid option. Use: shortcut add | del | list | remove");
    }
  },

  onChat: async function ({ sock, chatId, message, isGroup }) {
    if (!isGroup) return;

    const body = (
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text || ""
    ).trim().toLowerCase();

    if (!body) return;

    const threadData = await threadsData.get(chatId) || {};
    const shortcuts = threadData.shortcuts || [];
    if (!shortcuts.length) return;

    const match = shortcuts.find(s => s.key === body);
    if (!match) return;

    try {
      if (match.attachments?.length) {
        for (const aid of match.attachments) {
          const buf = drive.getFile(aid, "buffer");
          if (!buf) continue;

          const ext = aid.split(".").pop().toLowerCase();
          if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
            await sock.sendMessage(chatId, { image: buf, caption: match.content || "" }, { quoted: message });
          } else if (["mp4", "mkv", "avi"].includes(ext)) {
            await sock.sendMessage(chatId, { video: buf, caption: match.content || "" }, { quoted: message });
          } else if (["mp3", "ogg", "m4a", "wav"].includes(ext)) {
            await sock.sendMessage(chatId, { audio: buf, mimetype: "audio/mpeg" }, { quoted: message });
            if (match.content) await sock.sendMessage(chatId, { text: match.content }, { quoted: message });
          } else {
            await sock.sendMessage(chatId, { document: buf, fileName: aid, mimetype: "application/octet-stream" }, { quoted: message });
            if (match.content) await sock.sendMessage(chatId, { text: match.content }, { quoted: message });
          }
          return;
        }
      }

      if (match.content) {
        await sock.sendMessage(chatId, { text: match.content }, { quoted: message });
      }
    } catch (e) {}
  }
};

async function saveAttachments(event, chatId, senderId) {
  const ids = [];
  const msgTypes = [
    { key: "imageMessage", type: "image", ext: "jpg" },
    { key: "videoMessage", type: "video", ext: "mp4" },
    { key: "audioMessage", type: "audio", ext: "mp3" }
  ];

  for (const mt of msgTypes) {
    const mediaMsg = event.message?.[mt.key];
    if (mediaMsg) {
      try {
        const stream = await downloadContentFromMessage(mediaMsg, mt.type);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buf = Buffer.concat(chunks);
        const fileName = `shortcut_${chatId.split("@")[0]}_${senderId.split("@")[0]}_${Date.now()}.${mt.ext}`;
        await drive.uploadFile(fileName, buf);
        ids.push(fileName);
      } catch (e) {}
    }
  }

  const contextInfo = event.message?.extendedTextMessage?.contextInfo;
  const quoted = contextInfo?.quotedMessage;
  if (quoted) {
    for (const mt of msgTypes) {
      const mediaMsg = quoted[mt.key];
      if (mediaMsg) {
        try {
          const stream = await downloadContentFromMessage(mediaMsg, mt.type);
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          const buf = Buffer.concat(chunks);
          const fileName = `shortcut_${chatId.split("@")[0]}_${senderId.split("@")[0]}_${Date.now()}.${mt.ext}`;
          await drive.uploadFile(fileName, buf);
          ids.push(fileName);
        } catch (e) {}
      }
    }
  }

  return ids;
}

async function checkAdmin(sock, chatId, senderId) {
  try {
    const senderClean = senderId.split(":")[0].split("@")[0];
    const ownerNumbers = (global.config?.owner || []).map(o => String(o).replace(/[^0-9]/g, ""));
    if (ownerNumbers.includes(senderClean)) return true;

    const metadata = await sock.groupMetadata(chatId);
    const participant = metadata.participants.find(p => {
      const pClean = p.id.split(":")[0].split("@")[0];
      return pClean === senderClean;
    });
    return participant?.admin === "admin" || participant?.admin === "superadmin";
  } catch (e) {
    return false;
  }
}
