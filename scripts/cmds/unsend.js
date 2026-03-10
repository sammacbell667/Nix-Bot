module.exports = {
    config: {
        name: "unsend",
        aliases: ["un", "uns"],
        version: "1.0.0",
        role: 0,
        author: "ArYAN",
        category: "Utility",
        description: "Unsend a message by replying to it",
        nixPrefix: true,
        guide: {
            en: "Reply to any bot message and type {pn} to delete it."
        }
    },

    onStart: async function ({ sock, chatId, message, event, senderId }) {
        const quotedContext = event.message?.extendedTextMessage?.contextInfo;
        if (!quotedContext?.quotedMessage) {
            return await sock.sendMessage(chatId, { text: "❌ Please reply to the message you want to unsend." }, { quoted: event });
        }

        const quotedParticipant = quotedContext.participant || "";
        const botId = sock.user.id.split(":")[0].split("@")[0];
        const botLid = sock.user.lid ? sock.user.lid.split(":")[0].split("@")[0] : "";
        const quotedId = quotedParticipant.split(":")[0].split("@")[0];

        const isBotMessage = quotedId === botId || quotedId === botLid;

        const targetKey = {
            remoteJid: chatId,
            fromMe: isBotMessage,
            id: quotedContext.stanzaId,
            participant: quotedParticipant
        };

        try {
            await sock.sendMessage(chatId, { delete: targetKey });
        } catch (e) {
            console.error("Unsend Command Error:", e);
            await sock.sendMessage(chatId, { text: "❌ Failed to unsend the message. I may not have permission." }, { quoted: event });
        }
    }
};