module.exports = {
  config: {
    name: "tagall",
    aliases: [],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 1,
    description: "Mention all members in the group",
    category: "box chat",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ sock, chatId, event, reply, isGroup }) {
    if (!isGroup) {
      return reply("This command can only be used in groups.");
    }

    let groupMeta;
    try {
      groupMeta = await sock.groupMetadata(chatId);
    } catch (e) {
      return reply("Failed to get group info.");
    }

    const mentions = groupMeta.participants.map(p => p.id);
    const text = groupMeta.participants.map(p => {
      const num = p.id.split('@')[0];
      return `@${num}`;
    }).join('\n');

    await sock.sendMessage(chatId, { text, mentions }, { quoted: event });
  }
};
