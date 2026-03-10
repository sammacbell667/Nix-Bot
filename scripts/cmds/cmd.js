const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

function isURL(str) {
    try {
        new URL(str);
        return true;
    } catch (e) {
        return false;
    }
}

function getDomain(url) {
    const regex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/im;
    const match = url.match(regex);
    return match ? match[1] : null;
}

module.exports = {
    config: {
        name: "cmd",
        version: "0.0.1",
        author: "ArYAN",
        countDown: 5,
        role: 3,
        description: {
            vi: "Quản lý các tệp lệnh của bạn",
            en: "Manage your command files"
        },
        category: "owner",
        nixPrefix: true,
        guide: {
            en: "   {pn} load <command file name>"
                + "\n   {pn} loadAll"
                + "\n   {pn} install <url> <command file name>: Download and install a command file from a url, url is the path to the file (raw)"
                + "\n   {pn} install <command file name> <code>: Download and install a command file from a code, code is the code of the command"
        }
    },

    onStart: async function ({ sock, chatId, args, event, getLang, prefix }) {
        const commandPath = path.join(process.cwd(), 'scripts', 'cmds');
        const commands = global.NixBot.commands;
        const events = global.NixBot.eventCommands;

        if (!args[0]) {
            return sock.sendMessage(chatId, { text: getLang('handlerEvents.commandSyntaxError', prefix, 'cmd') }, { quoted: event });
        }

        const subCmd = args[0].toLowerCase();

        if (subCmd === "load" && args.length === 2) {
            if (!args[1]) {
                return sock.sendMessage(chatId, { text: "⚠️ | Please enter the command name you want to reload" }, { quoted: event });
            }

            let fileName = args[1];
            if (!fileName.endsWith('.js')) fileName += '.js';
            const filePath = path.join(commandPath, fileName);

            if (!fs.existsSync(filePath)) {
                return sock.sendMessage(chatId, { text: `⚠️ | Command file "${fileName}" not found in the scripts/cmds folder` }, { quoted: event });
            }

            try {
                const fullPath = path.resolve(filePath);
                const oldCommand = require.cache[fullPath] ? require(fullPath) : null;
                if (oldCommand?.config?.name) {
                    commands.delete(oldCommand.config.name);
                    if (oldCommand.config.aliases) {
                        for (const alias of oldCommand.config.aliases) {
                            commands.delete(alias);
                            global.NixBot.aliases.delete(alias);
                        }
                    }
                    const oldEvIdx = events.findIndex(e => e.config?.name === oldCommand.config.name);
                    if (oldEvIdx !== -1) events.splice(oldEvIdx, 1);
                }
                delete require.cache[fullPath];
                const command = require(fullPath);

                if (command.config && command.config.name) {
                    commands.set(command.config.name, command);
                    if (command.config.aliases) {
                        for (const alias of command.config.aliases) {
                            commands.set(alias, command);
                            global.NixBot.aliases.set(alias, command.config.name);
                        }
                    }
                    if (typeof command.onChat === 'function' || typeof command.onEvent === 'function' ||
                        typeof command.onReply === 'function' || typeof command.onReaction === 'function' ||
                        typeof command.onCall === 'function') {
                        events.push(command);
                    }
                    if (typeof command.onLoad === 'function') {
                        try { command.onLoad({ commands, events }); } catch (e) {}
                    }
                }

                const cmdName = command.config?.name || fileName.replace('.js', '');
                return sock.sendMessage(chatId, { text: `✅ | Loaded command "${cmdName}" successfully` }, { quoted: event });
            } catch (e) {
                return sock.sendMessage(chatId, {
                    text: `❌ | Failed to load command "${fileName}" with error\n${e.name}: ${e.message}`
                }, { quoted: event });
            }
        }

        if (subCmd === "loadall" || (subCmd === "load" && args.length > 2)) {
            const fileNeedToLoad = subCmd === "loadall"
                ? fs.readdirSync(commandPath).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''))
                : args.slice(1);

            const arraySuccess = [];
            const arrayFail = [];

            for (const name of fileNeedToLoad) {
                let fileName = name;
                if (!fileName.endsWith('.js')) fileName += '.js';
                const filePath = path.join(commandPath, fileName);

                if (!fs.existsSync(filePath)) {
                    arrayFail.push(` ❗ ${name} => FileNotFound: File not found`);
                    continue;
                }

                try {
                    const fullPath = path.resolve(filePath);
                    const oldCommand = require.cache[fullPath] ? require(fullPath) : null;
                    if (oldCommand?.config?.name) {
                        commands.delete(oldCommand.config.name);
                        if (oldCommand.config.aliases) {
                            for (const alias of oldCommand.config.aliases) {
                                commands.delete(alias);
                                global.NixBot.aliases.delete(alias);
                            }
                        }
                        const oldEvIdx = events.findIndex(e => e.config?.name === oldCommand.config.name);
                        if (oldEvIdx !== -1) events.splice(oldEvIdx, 1);
                    }
                    delete require.cache[fullPath];
                    const command = require(fullPath);

                    if (command.config && command.config.name) {
                        commands.set(command.config.name, command);
                        if (command.config.aliases) {
                            for (const alias of command.config.aliases) {
                                commands.set(alias, command);
                                global.NixBot.aliases.set(alias, command.config.name);
                            }
                        }
                        if (typeof command.onChat === 'function' || typeof command.onEvent === 'function' ||
                            typeof command.onReply === 'function' || typeof command.onReaction === 'function' ||
                            typeof command.onCall === 'function') {
                            events.push(command);
                        }
                        if (typeof command.onLoad === 'function') {
                            try { command.onLoad({ commands, events }); } catch (e) {}
                        }
                    }
                    arraySuccess.push(name);
                } catch (e) {
                    arrayFail.push(` ❗ ${name} => ${e.name}: ${e.message}`);
                }
            }

            let msg = "";
            if (arraySuccess.length > 0)
                msg += `✅ | Loaded successfully (${arraySuccess.length}) command`;
            if (arrayFail.length > 0) {
                msg += (msg ? "\n" : "") + `❌ | Failed to load (${arrayFail.length}) command\n${arrayFail.join("\n")}`;
                msg += "\n👀 | Open console to see error details";
            }

            return sock.sendMessage(chatId, { text: msg }, { quoted: event });
        }

        if (subCmd === "unload") {
            if (!args[1]) {
                return sock.sendMessage(chatId, { text: "⚠️ | Please enter the command name you want to unload" }, { quoted: event });
            }
            const cmdName = args[1].toLowerCase();
            const cmd = commands.get(cmdName);

            if (!cmd) {
                return sock.sendMessage(chatId, { text: `⚠️ | Command file "${cmdName}" not found` }, { quoted: event });
            }

            const configName = cmd.config?.name;
            if (cmd.config?.aliases) {
                for (const alias of cmd.config.aliases) {
                    commands.delete(alias);
                    global.NixBot.aliases.delete(alias);
                }
            }
            commands.delete(configName);

            const evIndex = events.findIndex(e => e.config?.name === configName);
            if (evIndex !== -1) events.splice(evIndex, 1);

            return sock.sendMessage(chatId, { text: `✅ | Unloaded command "${configName}" successfully` }, { quoted: event });
        }

        if (subCmd === "install") {
            let url = args[1];
            let fileName = args[2];

            if (!url) {
                return sock.sendMessage(chatId, { text: "⚠️ | Please enter the url or code and command file name you want to install" }, { quoted: event });
            }

            const body = (
                event.message?.conversation ||
                event.message?.extendedTextMessage?.text ||
                ""
            ).trim();

            let rawCode;

            if (url.endsWith('.js') && !isURL(url)) {
                const tmp = fileName;
                fileName = url;
                url = tmp;
            }

            if (url && url.match(/(https?:\/\/(?:www\.|(?!www)))/)) {
                if (!fileName || !fileName.endsWith('.js'))
                    return sock.sendMessage(chatId, { text: "⚠️ | Please enter the file name to save the command (with .js extension)" }, { quoted: event });

                const domain = getDomain(url);
                if (!domain)
                    return sock.sendMessage(chatId, { text: "⚠️ | Please enter a valid url" }, { quoted: event });

                try {
                    if (domain === "pastebin.com") {
                        const regex = /https:\/\/pastebin\.com\/(?!raw\/)(.*)/;
                        if (url.match(regex)) url = url.replace(regex, "https://pastebin.com/raw/$1");
                        if (url.endsWith("/")) url = url.slice(0, -1);
                    } else if (domain === "github.com") {
                        const regex = /https:\/\/github\.com\/(.*)\/blob\/(.*)/;
                        if (url.match(regex)) url = url.replace(regex, "https://raw.githubusercontent.com/$1/$2");
                    }

                    const res = await axios.get(url);
                    rawCode = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                } catch (e) {
                    return sock.sendMessage(chatId, {
                        text: `❌ | Failed to install command "${fileName}" with error\n${e.name}: ${e.message}`
                    }, { quoted: event });
                }
            } else {
                if (args[args.length - 1].endsWith(".js")) {
                    fileName = args[args.length - 1];
                    rawCode = body.slice(body.indexOf('install') + 7, body.lastIndexOf(fileName)).trim();
                } else if (args[1] && args[1].endsWith(".js")) {
                    fileName = args[1];
                    rawCode = body.slice(body.indexOf(fileName) + fileName.length).trim();
                } else {
                    return sock.sendMessage(chatId, { text: "⚠️ | Please enter the file name to save the command (with .js extension)" }, { quoted: event });
                }
            }

            if (!rawCode)
                return sock.sendMessage(chatId, { text: "⚠️ | Unable to get command code" }, { quoted: event });

            const filePath = path.join(commandPath, fileName);

            try {
                const oldFullPath = path.resolve(filePath);
                const oldCommand = require.cache[oldFullPath] ? require(oldFullPath) : null;
                if (oldCommand?.config?.name) {
                    commands.delete(oldCommand.config.name);
                    if (oldCommand.config.aliases) {
                        for (const alias of oldCommand.config.aliases) {
                            commands.delete(alias);
                            global.NixBot.aliases.delete(alias);
                        }
                    }
                    const oldEvIdx = events.findIndex(e => e.config?.name === oldCommand.config.name);
                    if (oldEvIdx !== -1) events.splice(oldEvIdx, 1);
                }

                fs.writeFileSync(filePath, rawCode);
                delete require.cache[oldFullPath];
                const command = require(oldFullPath);

                if (command.config && command.config.name) {
                    commands.set(command.config.name, command);
                    if (command.config.aliases) {
                        for (const alias of command.config.aliases) {
                            commands.set(alias, command);
                            global.NixBot.aliases.set(alias, command.config.name);
                        }
                    }
                    if (typeof command.onChat === 'function' || typeof command.onEvent === 'function' ||
                        typeof command.onReply === 'function' || typeof command.onReaction === 'function' ||
                        typeof command.onCall === 'function') {
                        events.push(command);
                    }
                }

                const cmdName = command.config?.name || fileName.replace('.js', '');
                return sock.sendMessage(chatId, {
                    text: `✅ | Installed command "${cmdName}" successfully, the command file is saved at ${path.join(__dirname, fileName).replace(process.cwd(), "")}`
                }, { quoted: event });
            } catch (e) {
                return sock.sendMessage(chatId, {
                    text: `❌ | Failed to install command "${fileName}" with error\n${e.name}: ${e.message}`
                }, { quoted: event });
            }
        }

        return sock.sendMessage(chatId, { text: getLang('handlerEvents.commandSyntaxError', prefix, 'cmd') }, { quoted: event });
    }
};