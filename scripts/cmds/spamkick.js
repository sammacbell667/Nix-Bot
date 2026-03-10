const messageCounts = {};
const spamThreshold = 10;
const spamInterval = 60000;
const disabledGroups = {};

module.exports = {
  config: {
    name: "spamkick",
    aliases: [],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 1,
    description: "Auto kick spammers from group",
    category: "box chat",
    guide: {
      en: "{pn} on/off"
    }
  },

  onStart: async function ({ sock, chatId, args, reply, isGroup }) {
    if (!isGroup) {
      return reply("This command can only be used in groups.");
    }

    const input = args[0]?.toLowerCase();

    if (input === "on") {
      delete disabledGroups[chatId];
      return reply("Spam detection is now enabled for this group.");
    } else if (input === "off") {
      disabledGroups[chatId] = true;
      return reply("Spam detection is now disabled for this group.");
    } else {
      const status = disabledGroups[chatId] ? "OFF" : "ON";
      return reply(`Spam detection is currently ${status}.\nUse: spamkick on/off`);
    }
  },

  onChat: async function ({ sock, chatId, senderId, isGroup }) {
    if (!isGroup) return;
    if (disabledGroups[chatId]) return;

    const botNumber = (sock.user?.id?.split(':')[0] || sock.user?.id?.split('@')[0] || '').replace(/\D/g, '');
    const senderNum = senderId.split(':')[0].split('@')[0].replace(/\D/g, '');
    if (senderNum === botNumber) return;

    const ownerNumbers = (global.NixBot?.config?.ownerNumber || []).map(n => n.replace(/\D/g, ''));
    if (ownerNumbers.includes(senderNum)) return;

    if (!messageCounts[chatId]) {
      messageCounts[chatId] = {};
    }

    if (!messageCounts[chatId][senderId]) {
      messageCounts[chatId][senderId] = {
        count: 1,
        timer: setTimeout(() => {
          if (messageCounts[chatId]) {
            delete messageCounts[chatId][senderId];
          }
        }, spamInterval),
      };
    } else {
      messageCounts[chatId][senderId].count++;

      if (messageCounts[chatId][senderId].count > spamThreshold) {
        clearTimeout(messageCounts[chatId][senderId].timer);
        delete messageCounts[chatId][senderId];

        let groupMeta;
        try {
          groupMeta = await sock.groupMetadata(chatId);
        } catch (e) {
          return;
        }

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

        if (!botIsAdmin) return;

        try {
          await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
        } catch (e) {
          const senderParticipant = groupMeta.participants.find(p => {
            const pId = p.id?.split(':')[0].split('@')[0].replace(/\D/g, '');
            return pId === senderNum;
          });
          if (senderParticipant) {
            try {
              await sock.groupParticipantsUpdate(chatId, [senderParticipant.id], 'remove');
            } catch (e2) {}
          }
        }

        try {
          await sock.sendMessage(chatId, {
            text: "Detected spamming. The user has been kicked from the group."
          });
        } catch (e) {}
      }
    }
  }
};
