module.exports = {
  config: {
    name: "onlyadminbox",
    aliases: ["onlyadbox", "adboxonly", "adminboxonly"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 1,
    category: "box chat",
    nixPrefix: true,
    description: {
      en: "Turn on/off only group admin can use bot"
    },
    guide: {
      en: "{pn} on: Only group admins can use bot in this group\n{pn} off: Everyone can use bot in this group"
    }
  },

  onStart: async function ({ sock, chatId, event, args, isGroup, threadsData, reply }) {
    if (!isGroup) return reply("This command can only be used in groups.");

    if (!args[0] || !["on", "off"].includes(args[0].toLowerCase())) {
      return reply("Usage: !adboxonly on/off");
    }

    const value = args[0].toLowerCase() === "on";

    const threadData = await threadsData.get(chatId);
    threadData.onlyAdminBox = value;
    await threadsData.set(chatId, threadData);

    if (value) {
      return reply("✅ Turned on: Only group admins can use bot in this group.");
    } else {
      return reply("✅ Turned off: Everyone can use bot in this group.");
    }
  }
};
