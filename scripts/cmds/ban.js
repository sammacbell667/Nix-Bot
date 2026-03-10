const { threadsData } = global.utils;

function cleanId(id) {
  return (id || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

module.exports = {
  config: {
    name: "ban",
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 1,
    prefix: true,
    category: "group",
    description: "Ban user from group - auto kick if added back",
    guide: {
      en: "{pn} <@tag | reply> <reason> - Ban & kick user from group"
        + "\n{pn} unban <@tag | reply> - Unban user so they can rejoin"
        + "\n{pn} list - Show all banned users in this group"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply, isGroup, senderId, commandName }) {
    if (!isGroup) return reply("This command can only be used in groups.");

    let groupMeta;
    try {
      groupMeta = await sock.groupMetadata(chatId);
    } catch (e) {
      return reply("Failed to get group info.");
    }

    const botNumber = (sock.user?.id?.split(":")[0] || "").replace(/\D/g, "");
    let botIsAdmin = false;
    for (const p of groupMeta.participants) {
      const pNum = (p.phoneNumber?.split("@")[0] || "").replace(/\D/g, "");
      const pId = (p.id?.split("@")[0] || "").replace(/\D/g, "");
      if (pNum === botNumber || pId === botNumber) {
        if (p.admin === "admin" || p.admin === "superadmin") botIsAdmin = true;
        break;
      }
    }

    if (!botIsAdmin) return reply("Bot needs to be admin to use this command.");

    const senderNum = cleanId(senderId);
    const senderParticipant = groupMeta.participants.find(p => cleanId(p.id) === senderNum);
    const senderIsAdmin = senderParticipant && (senderParticipant.admin === "admin" || senderParticipant.admin === "superadmin");
    const ownerNumbers = (global.config?.adminBot || []).map(n => n.replace(/\D/g, ""));
    const senderIsOwner = ownerNumbers.includes(senderNum);

    if (!senderIsAdmin && !senderIsOwner) return reply("You need to be a group admin to use this command.");

    const contextInfo = event.message?.extendedTextMessage?.contextInfo || {};
    const mentionedJids = contextInfo?.mentionedJid || [];
    const quotedParticipant = contextInfo?.participant || null;

    function getTargetId() {
      if (mentionedJids.length > 0) return cleanId(mentionedJids[0]);
      if (quotedParticipant) return cleanId(quotedParticipant);
      if (args[0] && /\d{7,}/.test(args[0])) return args[0].replace(/[^0-9]/g, "");
      return null;
    }

    function getTargetJid() {
      if (mentionedJids.length > 0) return mentionedJids[0];
      if (quotedParticipant) return quotedParticipant;
      const targetId = getTargetId();
      if (targetId) {
        const found = groupMeta.participants.find(p => cleanId(p.id) === targetId);
        if (found) return found.id;
        return targetId + "@s.whatsapp.net";
      }
      return null;
    }

    const threadData = await threadsData.get(chatId) || {};
    const groupBans = threadData.groupBans || [];

    if (args[0] === "unban") {
      args.shift();
      const targetId = getTargetId();
      if (!targetId) return reply("Please @tag or reply to a user to unban.");

      const idx = groupBans.findIndex(b => cleanId(b.id) === targetId);
      if (idx === -1) return reply(`User ${targetId} is not banned in this group.`);

      const removed = groupBans.splice(idx, 1)[0];
      await threadsData.set(chatId, { groupBans });
      return reply(`Unbanned ${removed.name || targetId} (${targetId}).\nThey can now rejoin the group.`);
    }

    if (args[0] === "list") {
      if (!groupBans.length) return reply("No banned users in this group.");

      let msg = `📋 Banned Users (${groupBans.length}):\n`;
      for (const ban of groupBans) {
        msg += `\n╭ ID: ${ban.id}`;
        msg += `\n│ Name: ${ban.name || "Unknown"}`;
        msg += `\n│ Reason: ${ban.reason || "No reason"}`;
        msg += `\n╰ Date: ${ban.date || "Unknown"}\n`;
      }
      return reply(msg);
    }

    const targetId = getTargetId();
    const targetJid = getTargetJid();
    if (!targetId || !targetJid) return reply("Please @tag or reply to a user to ban.");

    if (targetId === botNumber) return reply("You cannot ban the bot.");

    const targetParticipant = groupMeta.participants.find(p => cleanId(p.id) === targetId);
    if (targetParticipant && (targetParticipant.admin === "admin" || targetParticipant.admin === "superadmin")) {
      return reply("You cannot ban a group admin.");
    }

    if (ownerNumbers.includes(targetId)) return reply("You cannot ban a bot owner.");

    const existing = groupBans.find(b => cleanId(b.id) === targetId);
    if (existing) {
      return reply(`User ${existing.name || targetId} is already banned.\n» Reason: ${existing.reason || "No reason"}\n» Date: ${existing.date || "Unknown"}`);
    }

    let reason;
    if (mentionedJids.length > 0) {
      reason = args.join(" ").replace(/@\d+/g, "").trim();
    } else if (quotedParticipant) {
      reason = args.join(" ").trim();
    } else {
      reason = args.slice(1).join(" ").trim();
    }
    if (!reason) reason = "No reason";

    let name = targetId;
    const participant = groupMeta.participants.find(p => cleanId(p.id) === targetId);
    if (participant) name = participant.notify || participant.verifiedName || targetId;

    const now = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" });

    groupBans.push({ id: targetId, jid: targetJid, name, reason, date: now, bannedBy: cleanId(senderId) });
    await threadsData.set(chatId, { groupBans });

    try {
      await sock.groupParticipantsUpdate(chatId, [targetJid], "remove");
    } catch (e) {
      console.error("[BAN KICK ERROR]", e.message);
      return reply(`Banned ${name} (${targetId}) but failed to kick.\n» Reason: ${reason}\n» Date: ${now}\n\nBot may not have permission to kick this user.`);
    }

    return reply(`Banned & kicked ${name} (${targetId}).\n» Reason: ${reason}\n» Date: ${now}\n\nThey will be auto-kicked if added back. Use !unban to allow them to rejoin.`);
  },

  onEvent: async function ({ sock, eventData }) {
    if (eventData.type !== "group-participants.update") return;
    const { id, participants, action } = eventData.data;
    if (action !== "add") return;

    const threadData = await threadsData.get(id) || {};
    const groupBans = threadData.groupBans || [];
    if (!groupBans.length) return;

    for (const jid of participants) {
      const jidStr = typeof jid === "string" ? jid : jid?.id || jid?.toString() || "";
      if (!jidStr) continue;

      const num = cleanId(jidStr);
      const phoneNum = (typeof jid === "object" && jid?.phoneNumber || "").split(":")[0].split("@")[0].replace(/\D/g, "");

      const banned = groupBans.find(b => cleanId(b.id) === num || (phoneNum && cleanId(b.id) === phoneNum));
      if (banned) {
        try {
          await sock.sendMessage(id, { text: `@${num} is banned from this group.\n» Reason: ${banned.reason || "No reason"}\n\nAuto-kicking...`, mentions: [jidStr] });
          await sock.groupParticipantsUpdate(id, [jidStr], "remove");
        } catch (e) {}
      }
    }
  }
};
