module.exports = {
    config: {
        name: "uid",
        aliases: ["u", "id"],
        version: "1.1.0",
        role: 0,
        author: "ArYAN",
        category: "Utility",
        description: "Get user ID",
        usage: "uid [reply/mention/number]",
        guide: "Use /uid to get your ID, or reply/mention someone to get theirs."
    },

    onStart: async function ({ sock, chatId, message, senderId, args, reply, event, isGroup }) {
        try {
            let targets = [];

            const msg = event.message || message.message;
            const contextInfo = msg?.extendedTextMessage?.contextInfo
                || msg?.imageMessage?.contextInfo
                || msg?.videoMessage?.contextInfo
                || {};

            if (contextInfo.mentionedJid && contextInfo.mentionedJid.length > 0) {
                for (const jid of contextInfo.mentionedJid) {
                    targets.push(jid);
                }
            }

            if (targets.length === 0 && contextInfo.participant) {
                targets.push(contextInfo.participant);
            }

            if (targets.length === 0) {
                targets.push(senderId);
            }

            let result = "";
            for (const targetId of targets) {
                const cleanId = targetId.split('@')[0];
                const suffix = targetId.includes('@lid') ? '@lid' : '';
                result += `🆔 User ID: ${cleanId}${suffix}\n`;
            }

            return reply(result.trim());

        } catch (error) {
            console.error("[UID] Error:", error.message);
            return reply("Could not retrieve user ID.");
        }
    }
};
