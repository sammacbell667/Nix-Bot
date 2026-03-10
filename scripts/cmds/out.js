module.exports = {
  config: {
    name: "out",
    aliases: [],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 2,
    description: "Bot leaves the group",
    category: "box chat",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ sock, chatId, event, reply, isGroup }) {
    if (!isGroup) {
      return reply("This command can only be used in groups.");
    }

    try {
      await sock.groupLeave(chatId);
    } catch (e) {
      console.error("[OUT] Error:", e.message);
      return reply("Failed to leave the group.");
    }
  }
};
