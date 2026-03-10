const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const calledReplies = new Map();

function getAdminIds() {
  const config = global.config;
  const admins = new Set();
  if (config.roles) {
    for (const role of ["2", "3"]) {
      if (Array.isArray(config.roles[role])) {
        config.roles[role].forEach(id => admins.add(id.replace(/[^0-9]/g, '')));
      }
    }
  }
  if (Array.isArray(config.ownerNumber)) {
    config.ownerNumber.forEach(id => admins.add(id.replace(/[^0-9]/g, '')));
  }
  return [...admins].filter(Boolean);
}

async function resolveAdminJids(sock, adminIds) {
  const validJids = [];
  const resolved = new Set();
  for (const id of adminIds) {
    if (resolved.has(id)) continue;
    try {
      const [result] = await sock.onWhatsApp(id + "@s.whatsapp.net");
      if (result && result.exists) {
        validJids.push(result.jid);
        resolved.add(id);
        continue;
      }
    } catch (e) {}
    validJids.push(id + "@lid");
    resolved.add(id);
  }
  return validJids;
}

async function downloadMedia(sock, msg) {
  try {
    return await downloadMediaMessage(msg, 'buffer', {});
  } catch (e) {
    try {
      const stream = await sock.downloadMediaMessage(msg);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      return Buffer.concat(chunks);
    } catch (e2) {
      return null;
    }
  }
}

function getMediaInfo(msgContent) {
  if (msgContent.imageMessage) return { msg: msgContent.imageMessage, type: "image" };
  if (msgContent.videoMessage) return { msg: msgContent.videoMessage, type: "video" };
  if (msgContent.audioMessage) return { msg: msgContent.audioMessage, type: "audio" };
  if (msgContent.documentMessage) return { msg: msgContent.documentMessage, type: "document" };
  if (msgContent.stickerMessage) return { msg: msgContent.stickerMessage, type: "sticker" };
  return null;
}

async function sendMediaToJid(sock, jid, mediaBuffer, mediaInfo, captionText, quotedMsg) {
  const opts = quotedMsg ? { quoted: quotedMsg } : {};
  if (mediaInfo.type === "image") {
    return await sock.sendMessage(jid, { image: mediaBuffer, caption: captionText || "", mimetype: mediaInfo.msg.mimetype || "image/jpeg" }, opts);
  } else if (mediaInfo.type === "video") {
    return await sock.sendMessage(jid, { video: mediaBuffer, caption: captionText || "", mimetype: mediaInfo.msg.mimetype || "video/mp4" }, opts);
  } else if (mediaInfo.type === "audio") {
    return await sock.sendMessage(jid, { audio: mediaBuffer, mimetype: mediaInfo.msg.mimetype || "audio/ogg; codecs=opus", ptt: !!(mediaInfo.msg.ptt) }, opts);
  } else if (mediaInfo.type === "document") {
    return await sock.sendMessage(jid, { document: mediaBuffer, mimetype: mediaInfo.msg.mimetype || "application/octet-stream", fileName: mediaInfo.msg.fileName || "file" }, opts);
  } else if (mediaInfo.type === "sticker") {
    return await sock.sendMessage(jid, { sticker: mediaBuffer }, opts);
  }
}

function storeReplyData(key, data) {
  if (key && key.id) {
    calledReplies.set(key.id, data);
    setTimeout(() => calledReplies.delete(key.id), 24 * 60 * 60 * 1000);
  }
}

module.exports = {
  config: {
    name: "called",
    version: "0.0.5",
    author: "ArYAN",
    countDown: 10,
    role: 0,
    prefix: true,
    category: "utility",
    aliases: ["callad", "calladmin"],
    description: {
      en: "Send message/media to bot admins and get replies back"
    },
    guide: {
      en: "{pn} <message> - Send text to admins\n{pn} [attach media] - Send media to admins\nAdmin can reply to forwarded message to respond"
    }
  },

  onStart: async function ({ sock, chatId, senderId, message, event, args, reply, isGroup }) {
    const msg = event || message;
    const msgContent = msg.message || {};
    const text = args.join(" ") || "";

    const directMedia = getMediaInfo(msgContent);
    const quotedCtx = msgContent.extendedTextMessage?.contextInfo;
    const quotedMessage = quotedCtx?.quotedMessage || null;
    const quotedMedia = quotedMessage ? getMediaInfo(quotedMessage) : null;

    const hasMedia = !!directMedia;
    const hasQuotedMedia = !!quotedMedia;

    if (!text && !hasMedia && !hasQuotedMedia) {
      return reply("⚠️ Please provide a message or attach media.\n\nUsage:\n!called <your message>\nSend media with !called\nReply to media with !called");
    }

    const uniqueAdminIds = getAdminIds();
    if (uniqueAdminIds.length === 0) {
      return reply("❌ No bot admins configured.");
    }
    const adminJids = await resolveAdminJids(sock, uniqueAdminIds);

    const senderClean = senderId.split(":")[0].split("@")[0];
    const senderName = msg.pushName || senderClean;
    let groupInfo = "";
    if (isGroup) {
      try {
        const meta = await sock.groupMetadata(chatId);
        groupInfo = `\n👥 Group: ${meta.subject}`;
      } catch (e) {}
    }

    const header = `📞 CALLED\n\n👤 From: ${senderName}\n🆔 ID: ${senderClean}${groupInfo}`;

    let mediaBuffer = null;
    let mediaInfo = null;

    if (hasMedia) {
      mediaInfo = directMedia;
      mediaBuffer = await downloadMedia(sock, msg);
      if (!mediaBuffer) return reply("❌ Failed to download media.");
    } else if (hasQuotedMedia) {
      mediaInfo = quotedMedia;
      const quotedMsgFull = {
        key: { remoteJid: chatId, id: quotedCtx.stanzaId, participant: quotedCtx.participant },
        message: quotedMessage
      };
      mediaBuffer = await downloadMedia(sock, quotedMsgFull);
      if (!mediaBuffer) return reply("❌ Failed to download quoted media.");
    }

    const userMsgKey = msg.key;
    const userMsgText = text || "";

    let sent = 0;
    for (const adminJid of adminJids) {
      try {
        if (mediaBuffer && mediaInfo) {
          const caption = `${header}\n\n💬 ${text || mediaInfo.msg.caption || ""}`.trim();
          await sendMediaToJid(sock, adminJid, mediaBuffer, mediaInfo, caption);
        }

        const anchorText = mediaBuffer
          ? `${header}\n\n💬 ${text || "[media attached]"}\n\n↩️ Reply this message to respond to ${senderName}`
          : `${header}\n\n💬 Message: ${text}\n\n↩️ Reply this message to respond to ${senderName}`;

        const sentMsg = await sock.sendMessage(adminJid, { text: anchorText });

        if (sentMsg && sentMsg.key) {
          storeReplyData(sentMsg.key, {
            type: "adminGotCall",
            originalChatId: chatId,
            originalSenderId: senderId,
            senderName: senderName,
            senderClean: senderClean,
            userMsgKey: userMsgKey,
            userMsgText: userMsgText,
            userFullMsg: msg
          });
        }
        sent++;
      } catch (e) {
        console.error(`[CALLED] Failed to send to ${adminJid}:`, e.message);
      }
    }

    if (sent > 0) {
      return reply(`✅ Your message has been sent to ${sent} admin(s).\nThey will get back to you soon!`);
    } else {
      return reply("❌ Failed to reach any admin. Try again later.");
    }
  },

  onReply: async function ({ sock, chatId, senderId, message, event, quotedMsg }) {
    const msg = event || message;
    const msgContent = msg.message || {};

    const quotedStanzaId = quotedMsg?.stanzaId;
    if (!quotedStanzaId) return;

    const replyData = calledReplies.get(quotedStanzaId);
    if (!replyData) return;

    const replyText = (
      msgContent.conversation ||
      msgContent.extendedTextMessage?.text ||
      msgContent.imageMessage?.caption ||
      msgContent.videoMessage?.caption ||
      msgContent.documentMessage?.caption ||
      ""
    ).trim();

    const replyMedia = getMediaInfo(msgContent);
    let replyBuffer = null;
    if (replyMedia) {
      replyBuffer = await downloadMedia(sock, msg);
    }

    if (!replyText && !replyBuffer) return;

    if (replyData.type === "adminGotCall" || replyData.type === "adminContinue") {
      try {
        const quoteTarget = replyData.userFullMsg || {
          key: {
            remoteJid: replyData.originalChatId,
            fromMe: false,
            id: replyData.userMsgKey?.id,
            participant: replyData.originalSenderId
          },
          message: { conversation: replyData.userMsgText || "" }
        };

        const replyHeader = `📍 Reply from Admin`;

        let userSentMsg = null;

        if (replyBuffer && replyMedia) {
          const caption = `${replyHeader}\n\n💬 ${replyText || ""}`.trim();
          userSentMsg = await sendMediaToJid(sock, replyData.originalChatId, replyBuffer, replyMedia, caption, quoteTarget);
        } else {
          userSentMsg = await sock.sendMessage(
            replyData.originalChatId,
            { text: `${replyHeader}\n\n💬 ${replyText}` },
            { quoted: quoteTarget }
          );
        }

        if (userSentMsg && userSentMsg.key) {
          storeReplyData(userSentMsg.key, {
            type: "userGotAdminReply",
            originalChatId: replyData.originalChatId,
            originalSenderId: replyData.originalSenderId,
            senderName: replyData.senderName,
            senderClean: replyData.senderClean,
            adminChatId: chatId,
            adminSenderId: senderId
          });
        }

        const confirmMsg = await sock.sendMessage(chatId, {
          text: `✅ Reply sent to ${replyData.senderName}!\n\n↩️ Reply here to send another message`
        });

        if (confirmMsg && confirmMsg.key) {
          storeReplyData(confirmMsg.key, {
            type: "adminContinue",
            originalChatId: replyData.originalChatId,
            originalSenderId: replyData.originalSenderId,
            senderName: replyData.senderName,
            senderClean: replyData.senderClean,
            userMsgKey: replyData.userMsgKey,
            userMsgText: replyData.userMsgText,
            userFullMsg: replyData.userFullMsg
          });
        }
      } catch (e) {
        console.error("[CALLED] Reply forward error:", e.message);
        await sock.sendMessage(chatId, { text: "❌ Failed to send reply to user." });
      }

    } else if (replyData.type === "userGotAdminReply") {
      try {
        const adminChatId = replyData.adminChatId;
        const senderClean = senderId.split(":")[0].split("@")[0];
        const senderName = msg.pushName || senderClean;

        const header = `📞 Reply from ${senderName}`;

        if (replyBuffer && replyMedia) {
          const caption = `${header}\n\n💬 ${replyText || ""}`.trim();
          await sendMediaToJid(sock, adminChatId, replyBuffer, replyMedia, caption);
        }

        const anchorText = replyBuffer
          ? `${header}\n\n💬 ${replyText || "[media attached]"}\n\n↩️ Reply to respond`
          : `${header}\n\n💬 ${replyText}\n\n↩️ Reply to respond`;

        const adminSentMsg = await sock.sendMessage(adminChatId, { text: anchorText });

        if (adminSentMsg && adminSentMsg.key) {
          storeReplyData(adminSentMsg.key, {
            type: "adminGotCall",
            originalChatId: chatId,
            originalSenderId: senderId,
            senderName: senderName,
            senderClean: senderClean,
            userMsgKey: msg.key,
            userMsgText: replyText,
            userFullMsg: msg
          });
        }

        await sock.sendMessage(chatId, { text: `✅ Your message has been sent to admin` });
      } catch (e) {
        console.error("[CALLED] User reply forward error:", e.message);
      }
    }
  }
};
