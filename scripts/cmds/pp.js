module.exports = {
  config: {
    name: "pp",
    aliases: ["profile"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    category: "Utility",
    nixPrefix: true,
    description: {
      en: "Get user's profile picture"
    },
    guide: {
      en: "{pn}: Get your profile picture\n{pn} @user: Get mentioned user's profile picture\n{pn} [number]: Get profile picture by number\nReply to a message to get that user's profile picture"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, args }) {
    try {
      let targetId;

      if (args.length > 0 && !args[0].startsWith("@")) {
        const raw = args[0].replace(/\D/g, "");
        if (raw.length > 6) {
          targetId = raw + "@s.whatsapp.net";
        }
      }

      if (!targetId) {
        const contextInfo = event.message?.extendedTextMessage?.contextInfo;
        const quoted = contextInfo?.participant;
        const mentions = contextInfo?.mentionedJid;

        if (quoted) {
          targetId = quoted;
        } else if (mentions && mentions.length > 0) {
          targetId = mentions[0];
        } else {
          targetId = senderId;
        }
      }

      if (!targetId) {
        return sock.sendMessage(chatId, { text: "Could not determine target user." }, { quoted: event });
      }

      let ppUrl;
      try {
        ppUrl = await sock.profilePictureUrl(targetId, "image");
      } catch (e) {
        return sock.sendMessage(chatId, { text: "This user has no profile picture or it's not accessible." }, { quoted: event });
      }

      await sock.sendMessage(chatId, {
        image: { url: ppUrl }
      }, { quoted: event });

    } catch (e) {
      console.error("[PP] Error:", e.message);
      await sock.sendMessage(chatId, { text: "Failed to get profile picture." }, { quoted: event });
    }
  }
};
