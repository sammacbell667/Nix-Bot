module.exports = {
  config: {
    name: "ping",
    aliases: [],
    version: "1.0.0",
    author: "ArYAN",
    prefix: true,
    role: 0,
    category: "utility",
    description: "Check bot response time.",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ sock, chatId, event, reply }) {
    const start = Date.now();
    const sent = await sock.sendMessage(chatId, { text: "Pinging..." }, { quoted: event });
    const ping = Date.now() - start;
    await sock.sendMessage(chatId, { text: `🏓 Pong!\nResponse: ${ping}ms`, edit: sent.key });
  }
};
