module.exports = {
  config: {
    name: "kick",
    version: "1.2",
    author: "ArYAN",
    countDown: 5,
    role: 1,
    description: "Kick member out of chat box",
    category: "box chat",
    guide: {
      en: "{pn} @tags or reply to a message"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, args, reply, isGroup }) {
    if (!isGroup) {
      return reply("This command can only be used in groups.");
    }

    let groupMeta;
    try {
      groupMeta = await sock.groupMetadata(chatId);
    } catch (e) {
      return reply("Please add admin for bot before using this feature.");
    }

    const botNumber = (sock.user?.id?.split(':')[0] || sock.user?.id?.split('@')[0] || '').replace(/\D/g, '');
    let botIsAdmin = false;

    for (const p of groupMeta.participants) {
      const pNum = p.phoneNumber?.split('@')[0]?.replace(/\D/g, '') || '';
      const pId = p.id?.split('@')[0]?.replace(/\D/g, '') || '';

      if (pNum === botNumber || pId === botNumber) {
        if (p.admin === 'admin' || p.admin === 'superadmin') {
          botIsAdmin = true;
        }
        break;
      }
    }

    if (!botIsAdmin) {
      return reply("Please add admin for bot before using this feature.");
    }

    let uidsToKick = [];

    const msg = event.message;
    const contextInfo = msg?.extendedTextMessage?.contextInfo
      || msg?.imageMessage?.contextInfo
      || msg?.videoMessage?.contextInfo
      || event.message?.contextInfo
      || {};

    if (contextInfo.mentionedJid && contextInfo.mentionedJid.length > 0) {
      for (const jid of contextInfo.mentionedJid) {
        if (!uidsToKick.includes(jid)) {
          uidsToKick.push(jid);
        }
      }
    }

    if (uidsToKick.length === 0 && contextInfo.participant) {
      uidsToKick.push(contextInfo.participant);
    }

    for (const item of args) {
      let cleaned = item.replace(/[@\s\-\+\(\)]/g, '');
      if (/^\d{7,15}$/.test(cleaned)) {
        if (cleaned.startsWith('0')) {
          cleaned = '88' + cleaned;
        }
        const phoneJid = cleaned + "@s.whatsapp.net";
        try {
          const results = await sock.onWhatsApp(phoneJid);
          if (results && results.length > 0 && results[0].exists) {
            const resolved = results[0].jid;
            if (!uidsToKick.includes(resolved)) {
              uidsToKick.push(resolved);
            }
            continue;
          }
        } catch (e) {}
        const lidMatch = groupMeta.participants.find(p => {
          const pNum = p.phoneNumber?.split('@')[0]?.replace(/\D/g, '') || '';
          return pNum === cleaned;
        });
        if (lidMatch && !uidsToKick.includes(lidMatch.id)) {
          uidsToKick.push(lidMatch.id);
        }
      }
    }

    if (uidsToKick.length === 0) {
      return reply("Please @mention, reply, or provide a phone number to kick.");
    }

    const successList = [];
    const failedList = [];

    for (const uid of uidsToKick) {
      try {
        await sock.groupParticipantsUpdate(chatId, [uid], 'remove');
        successList.push(uid);
      } catch (err) {
        console.error("[KICK] Error:", err.message);
        failedList.push(uid);
      }
    }

    let msg2 = "";
    if (successList.length > 0) {
      msg2 += `- Successfully kicked ${successList.length} member(s)`;
    }
    if (failedList.length > 0) {
      if (msg2) msg2 += "\n";
      msg2 += `- Failed to kick ${failedList.length} member(s)`;
    }

    return reply(msg2.trim());
  }
};
