const { exec } = require("child_process");

module.exports = {
    config: {
        name: "shell",
        aliases: ["sh", "terminal"],
        version: "1.1.0",
        role: 3,
        author: "ArYAN",
        category: "Developer",
        description: "Execute shell commands (Developer only)",
        usage: "shell <command>",
        guide: "Use /shell <command> to run terminal commands."
    },

    onStart: async function ({ sock, chatId, message, args }) {
        const command = args.join(" ");
        if (!command) {
            return await sock.sendMessage(chatId, { text: "⚠️ Usage: shell <command>" }, { quoted: message });
        }

        exec(command, { timeout: 10000 }, async (error, stdout, stderr) => {
            let output = "";

            if (error) output += `❌ Error:\n${error.message}\n`;
            if (stderr) output += `⚠️ Stderr:\n${stderr}\n`;
            if (stdout) output += `✅ Output:\n${stdout}\n`;

            if (output.length > 3000) output = output.slice(0, 3000) + "\n...truncated";

            await sock.sendMessage(chatId, { text: output || "✅ Done." }, { quoted: message });
        });
    }
};
