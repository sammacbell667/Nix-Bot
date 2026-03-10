module.exports = {
  config: {
    name: "tid",
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    prefix: true,
    category: "utility",
    description: {
      en: "Get group thread ID"
    },
    guide: {
      en: "{pn}: Get the current group's thread ID"
    }
  },

  onStart: async function ({ chatId, isGroup, reply }) {
    if (!isGroup) {
      return reply("⚠️ This command can only be used in groups.");
    }
    return reply(chatId.replace("@g.us", ""));
  }
};
