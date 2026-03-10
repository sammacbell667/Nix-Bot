const { getAntilink, setAntilink, checkAntilink } = global.utils;

const warnCount = new Map();

function getWarnKey(groupId, userNum) {
  return `${groupId}_${userNum}`;
}

function addWarn(groupId, userNum) {
  const key = getWarnKey(groupId, userNum);
  const count = (warnCount.get(key) || 0) + 1;
  warnCount.set(key, count);
  return count;
}

function resetWarn(groupId, userNum) {
  warnCount.delete(getWarnKey(groupId, userNum));
}

module.exports = {
  config: {
    name: "antilink",
    aliases: ["al"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 3,
    role: 1,
    prefix: true,
    category: "moderation",
    description: "Manage and enforce link-blocking policies in your group.",
    guide: {
      en: "{pn} off - Disable antilink protection\n{pn} whatsapp - Block WhatsApp group links\n{pn} whatsappchannel - Block WhatsApp channel links\n{pn} telegram - Block Telegram links\n{pn} facebook - Block Facebook links\n{pn} all - Block all types of links"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply, isGroup }) {
    if (!isGroup) return reply("This command can only be used in groups.");

    const sub = args[0]?.toLowerCase();

    if (!sub) {
      const current = getAntilink(chatId);
      let msg = "Antilink Commands:\n";
      msg += "1. antilink off - Disable antilink protection\n";
      msg += "2. antilink whatsapp - Block WhatsApp group links\n";
      msg += "3. antilink whatsappchannel - Block WhatsApp channel links\n";
      msg += "4. antilink telegram - Block Telegram links\n";
      msg += "5. antilink facebook - Block Facebook links\n";
      msg += "6. antilink all - Block all types of links\n\n";
      msg += `Current setting: ${current}`;
      return reply(msg);
    }

    switch (sub) {
      case "off":
        setAntilink(chatId, "off");
        return reply("Antilink protection is now turned off.");
      case "whatsapp":
        setAntilink(chatId, "whatsapp");
        return reply("WhatsApp group links are now blocked.");
      case "whatsappchannel":
        setAntilink(chatId, "whatsappchannel");
        return reply("WhatsApp channel links are now blocked.");
      case "telegram":
        setAntilink(chatId, "telegram");
        return reply("Telegram links are now blocked.");
      case "facebook":
        setAntilink(chatId, "facebook");
        return reply("Facebook links are now blocked.");
      case "all":
        setAntilink(chatId, "all");
        return reply("All types of links are now blocked.");
      default:
        return reply("Invalid subcommand. Use !antilink for help.");
    }
  },

  onChat: async function ({ sock, chatId, event, senderId, isGroup }) {
    if (!isGroup) return;

    const mode = getAntilink(chatId);
    if (mode === "off") return;

    const body = (
      event.message?.conversation
      || event.message?.extendedTextMessage?.text
      || event.message?.imageMessage?.caption
      || event.message?.videoMessage?.caption
      || ""
    ).trim();

    if (!body) return;
    if (!checkAntilink(body, mode)) return;

    const senderJid = event.key?.participant || senderId;
    const senderNum = senderJid.split("@")[0].split(":")[0];

    const botJid = sock.user?.id || "";
    const botNum = botJid.split("@")[0].split(":")[0];
    if (senderNum === botNum) return;

    let isSenderAdmin = false;
    try {
      const groupMeta = await sock.groupMetadata(chatId);
      const participant = groupMeta.participants.find(p => {
        const pNum = p.id.split("@")[0].split(":")[0];
        return pNum === senderNum;
      });
      isSenderAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
    } catch (e) {}

    if (isSenderAdmin) return;

    try {
      await sock.sendMessage(chatId, {
        delete: {
          remoteJid: chatId,
          fromMe: false,
          id: event.key.id,
          participant: senderJid
        }
      });

      const warns = addWarn(chatId, senderNum);

      if (warns >= 3) {
        resetWarn(chatId, senderNum);
        await sock.sendMessage(chatId, {
          text: `⚠️ @${senderNum} has been warned 3 times for posting links. Removing from group.`,
          mentions: [senderJid]
        });
        try {
          await sock.groupParticipantsUpdate(chatId, [senderJid], "remove");
        } catch (kickErr) {
          console.error("[ANTILINK KICK ERROR]", kickErr.message);
        }
      } else {
        await sock.sendMessage(chatId, {
          text: `⚠️ Warning ${warns}/3! @${senderNum}, posting links is not allowed in this group.`,
          mentions: [senderJid]
        });
      }
    } catch (err) {
      console.error("[ANTILINK ERROR]", err.message);
    }
  }
};
