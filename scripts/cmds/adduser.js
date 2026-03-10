module.exports = {
  config: {
    name: "adduser",
    aliases: ["add"],
    version: "1.0",
    author: "ArYAN",
    countDown: 5,
    role: 1,
    description: "Add user to group chat",
    category: "box chat",
    guide: {
      en: "{pn} [phone number | @mention | reply]"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, args, reply, isGroup }) {
    const lang = {
      alreadyInGroup: "𝙰𝚕𝚛𝚎𝚊𝚍𝚢 𝚒𝚗 𝚐𝚛𝚘𝚞𝚙",
      successAdd: "- 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 𝐚𝐝𝐝𝐞𝐝 %1 𝐦𝐞𝐦𝐛𝐞𝐫(𝐬) 𝐭𝐨 𝐭𝐡𝐞 𝐠𝐫𝐨𝐮𝐩",
      failedAdd: "- 𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐚𝐝𝐝 %1 𝐦𝐞𝐦𝐛𝐞𝐫(𝐬) 𝐭𝐨 𝐭𝐡𝐞 𝐠𝐫𝐨𝐮𝐩",
      approve: "- 𝐀𝐝𝐝𝐞𝐝 %1 𝐦𝐞𝐦𝐛𝐞𝐫(𝐬) 𝐭𝐨 𝐭𝐡𝐞 𝐚𝐩𝐩𝐫𝐨𝐯𝐚𝐥 𝐥𝐢𝐬𝐭",
      cannotAddUser: "𝙱𝚘𝚝 𝚒𝚜 𝚋𝚕𝚘𝚌𝚔𝚎𝚍 𝚘𝚛 𝚞𝚜𝚎𝚛 𝚋𝚕𝚘𝚌𝚔𝚎𝚍 𝚜𝚝𝚛𝚊𝚗𝚐𝚎𝚛𝚜 𝚏𝚛𝚘𝚖 𝚊𝚍𝚍𝚒𝚗𝚐 𝚝𝚘 𝚐𝚛𝚘𝚞𝚙",
      notGroup: "❌ 𝐓𝐡𝐢𝐬 𝐜𝐨𝐦𝐦𝐚𝐧𝐝 𝐜𝐚𝐧 𝐨𝐧𝐥𝐲 𝐛𝐞 𝐮𝐬𝐞𝐝 𝐢𝐧 𝐠𝐫𝐨𝐮𝐩𝐬.",
      noInput: "𝐏𝐥𝐞𝐚𝐬𝐞 𝐩𝐫𝐨𝐯𝐢𝐝𝐞 𝐚 𝐩𝐡𝐨𝐧𝐞 𝐧𝐮𝐦𝐛𝐞𝐫, @𝐦𝐞𝐧𝐭𝐢𝐨𝐧, 𝐨𝐫 𝐫𝐞𝐩𝐥𝐲 𝐭𝐨 𝐚 𝐦𝐞𝐬𝐬𝐚𝐠𝐞.",
      notOnWhatsApp: "𝙽𝚘𝚝 𝚛𝚎𝚐𝚒𝚜𝚝𝚎𝚛𝚎𝚍 𝚘𝚗 𝚆𝚑𝚊𝚝𝚜𝙰𝚙𝚙"
    };

    if (!isGroup) {
      return reply(lang.notGroup);
    }

    let uidsToAdd = [];

    const msg = event.message;
    const contextInfo = msg?.extendedTextMessage?.contextInfo
      || msg?.imageMessage?.contextInfo
      || msg?.videoMessage?.contextInfo
      || msg?.conversation?.contextInfo
      || event.message?.contextInfo
      || {};

    if (contextInfo.mentionedJid && contextInfo.mentionedJid.length > 0) {
      for (const jid of contextInfo.mentionedJid) {
        uidsToAdd.push(jid);
      }
    }

    if (contextInfo.participant) {
      const repliedJid = contextInfo.participant;
      if (!uidsToAdd.includes(repliedJid)) {
        uidsToAdd.push(repliedJid);
      }
    }

    for (const item of args) {
      let cleaned = item.replace(/[@\s\-\+\(\)]/g, '');
      if (/^\d{7,15}$/.test(cleaned)) {
        if (cleaned.startsWith('0')) {
          cleaned = '88' + cleaned;
        }
        const phoneJid = cleaned + "@s.whatsapp.net";
        if (!uidsToAdd.includes(phoneJid)) {
          uidsToAdd.push(phoneJid);
        }
      }
    }

    if (uidsToAdd.length === 0) {
      return reply(lang.noInput);
    }

    let groupMeta;
    try {
      groupMeta = await sock.groupMetadata(chatId);
    } catch (e) {
      groupMeta = { participants: [] };
    }

    const currentMembers = groupMeta.participants.map(p => p.id);

    const success = [];
    const waitApproval = [];
    const failed = [];

    for (const uid of uidsToAdd) {
      let resolvedJid = uid;

      if (uid.endsWith("@lid")) {
        try {
          const phoneNum = uid.split("@")[0];
          const [result] = await sock.onWhatsApp(phoneNum + "@s.whatsapp.net");
          if (result && result.jid) {
            resolvedJid = result.jid;
          }
        } catch (e) {}
      }

      if (currentMembers.some(m => m === resolvedJid || m === uid)) {
        const displayNum = uid.replace(/@.*/, '');
        failed.push({ uid: displayNum, reason: lang.alreadyInGroup });
        continue;
      }

      if (resolvedJid.endsWith("@s.whatsapp.net")) {
        try {
          const results = await sock.onWhatsApp(resolvedJid);
          if (!results || results.length === 0 || !results[0].exists) {
            const displayNum = uid.replace(/@.*/, '');
            failed.push({ uid: displayNum, reason: lang.notOnWhatsApp });
            continue;
          }
          resolvedJid = results[0].jid;
        } catch (e) {
          console.error("[ADDUSER] onWhatsApp check error:", e.message);
        }
      }

      async function tryInviteFallback() {
        try {
          const invResult = await sock.groupParticipantsUpdate(chatId, [resolvedJid], 'invite');
          const invStatus = Number(invResult?.[0]?.status || invResult?.[0]?.content?.toString() || 0);
          if (invStatus === 200 || invStatus === 409) {
            waitApproval.push(resolvedJid);
            return true;
          }
        } catch (e) {}
        try {
          const code = await sock.groupInviteCode(chatId);
          const link = `https://chat.whatsapp.com/${code}`;
          const groupName = groupMeta.subject || "the group";
          await sock.sendMessage(resolvedJid, { text: `You have been invited to rejoin "${groupName}":\n${link}` });
          waitApproval.push(resolvedJid);
          return true;
        } catch (e) {}
        return false;
      }

      try {
        const result = await sock.groupParticipantsUpdate(chatId, [resolvedJid], 'add');
        const status = result?.[0]?.status || result?.[0]?.content?.toString() || "";
        const statusNum = Number(status) || 0;

        if (statusNum === 200) {
          success.push(resolvedJid);
        } else if (statusNum === 403 || statusNum === 408) {
          const invited = await tryInviteFallback();
          if (!invited) {
            const displayNum = uid.replace(/@.*/, '');
            failed.push({ uid: displayNum, reason: lang.cannotAddUser });
          }
        } else if (statusNum === 409) {
          waitApproval.push(resolvedJid);
        } else {
          const displayNum = uid.replace(/@.*/, '');
          failed.push({ uid: displayNum, reason: lang.cannotAddUser });
        }
      } catch (err) {
        const errCode = err.data || 0;
        const errMsg = err.message || "";
        if (errMsg.includes('403') || errMsg.includes('408') || errCode === 403 || errCode === 408) {
          const invited = await tryInviteFallback();
          if (!invited) {
            const displayNum = uid.replace(/@.*/, '');
            failed.push({ uid: displayNum, reason: lang.cannotAddUser });
          }
        } else {
          console.error("[ADDUSER] Add error:", errMsg);
          const displayNum = uid.replace(/@.*/, '');
          failed.push({ uid: displayNum, reason: lang.cannotAddUser });
        }
      }
    }

    let msg2 = "";
    if (success.length > 0) {
      msg2 += lang.successAdd.replace("%1", success.length) + "\n";
    }
    if (waitApproval.length > 0) {
      msg2 += lang.approve.replace("%1", waitApproval.length) + "\n";
    }
    if (failed.length > 0) {
      msg2 += lang.failedAdd.replace("%1", failed.length);
      for (const f of failed) {
        msg2 += `\n    + ${f.uid}: ${f.reason}`;
      }
    }

    if (!msg2.trim()) {
      msg2 = "❌ 𝐍𝐨 𝐮𝐬𝐞𝐫𝐬 𝐜𝐨𝐮𝐥𝐝 𝐛𝐞 𝐚𝐝𝐝𝐞𝐝.";
    }

    return reply(msg2.trim());
  }
};
