const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "prefix",
    version: "1.6",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    description: "Change bot prefix",
    category: "config",
    guide: {
      en: "{pn} <new prefix>: change prefix in this chat\nExample: {pn} #\n\n{pn} <new prefix> -g: change global prefix (admin only)\nExample: {pn} # -g"
    }
  },

  onStart: async function ({ sock, message, event, role, args, getLang, chatId }) {
    if (!args[0]) {
        const globalPrefix = global.NixBot.config.prefix;
        const threadPrefix = global.NixBot.threadConfig?.get(chatId)?.prefix || globalPrefix;
        return sock.sendMessage(chatId, { text: getLang('systemPrefix', { globalPrefix, threadPrefix }) }, { quoted: message });
    }

    const newPrefix = args[0];
    const isGlobal = args[1] === "-g";

    if (isGlobal && role < 2) {
        return sock.sendMessage(chatId, { text: getLang('adminOnlyPrefix') }, { quoted: message });
    }

    const confirmMsg = isGlobal 
        ? getLang('confirmGlobalPrefix', { newPrefix })
        : getLang('confirmThreadPrefix', { newPrefix });

    const sent = await sock.sendMessage(chatId, { text: confirmMsg }, { quoted: message });

    if (!global.NixBot.onReaction) global.NixBot.onReaction = new Map();
    
    global.NixBot.onReaction.set(sent.key.id, {
        author: event.key.participant || event.key.remoteJid,
        newPrefix,
        isGlobal,
        chatId
    });
  },

  onReaction: async function ({ sock, event, reaction }) {
    const messageId = event.message?.reactionMessage?.key?.id || event.key?.id;
    const reactionData = global.NixBot.onReaction?.get(messageId);

    if (!reactionData) return;

    const { author, newPrefix, isGlobal, chatId } = reactionData;
    const reactor = event.key.participant || event.key.remoteJid;

    if (reactor !== author) return;

    if (isGlobal) {
        global.NixBot.config.prefix = newPrefix;
        const configPath = path.join(process.cwd(), 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config.prefix = newPrefix;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        await sock.sendMessage(chatId, { text: (global.NixBot.lang ? (require('../../bot/push.js').getLang ? require('../../bot/push.js').getLang('globalPrefixUpdated', { newPrefix }) : `✅ Global prefix updated to: ${newPrefix}`) : `✅ Global prefix updated to: ${newPrefix}`) });
    } else {
        if (!global.NixBot.threadConfig) global.NixBot.threadConfig = new Map();
        global.NixBot.threadConfig.set(chatId, { prefix: newPrefix });
        await sock.sendMessage(chatId, { text: (global.NixBot.lang ? (require('../../bot/push.js').getLang ? require('../../bot/push.js').getLang('threadPrefixUpdated', { newPrefix }) : `✅ Prefix for this chat updated to: ${newPrefix}`) : `✅ Prefix for this chat updated to: ${newPrefix}`) });
    }

    global.NixBot.onReaction.delete(messageId);
  },

  onChat: async function ({ sock, chatId, message, event, getLang }) {
    const body = (event.message?.conversation || event.message?.extendedTextMessage?.text || "").toLowerCase();
    if (body === "prefix") {
        const globalPrefix = global.NixBot.config.prefix;
        const threadPrefix = global.NixBot.threadConfig?.get(chatId)?.prefix || globalPrefix;
        return sock.sendMessage(chatId, { text: getLang('systemPrefix', { globalPrefix, threadPrefix }) }, { quoted: message });
    }
  }
};