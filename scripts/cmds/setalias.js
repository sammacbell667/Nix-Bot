const { threadsData } = global.utils;

module.exports = {
  config: {
    name: "setalias",
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 1,
    prefix: true,
    category: "config",
    description: "Add or remove custom alias for commands in your group",
    guide: {
      en: "{pn} add <alias> <command> - Add alias for a command in this group"
        + "\n{pn} add <alias> <command> -g - Add alias globally (bot admin only)"
        + "\n{pn} remove <alias> <command> - Remove alias in this group"
        + "\n{pn} remove <alias> <command> -g - Remove alias globally (bot admin only)"
        + "\n{pn} list - List all aliases in this group"
        + "\n{pn} list -g - List all global aliases"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply, isGroup, senderId }) {
    const commands = global.NixBot.commands;
    const ownerNumbers = (global.config?.adminBot || []).map(n => n.replace(/\D/g, ""));
    const senderNum = (senderId || "").split("@")[0].split(":")[0].replace(/\D/g, "");
    const isOwner = ownerNumbers.includes(senderNum);

    const sub = (args[0] || "").toLowerCase();

    if (sub === "add") {
      if (!args[1] || !args[2]) return reply("Usage: setalias add <alias> <command>");

      const alias = args[1].toLowerCase();
      const commandName = args[2].toLowerCase();
      const isGlobal = args[3] === "-g";

      let cmdExists = false;
      for (const [name] of commands) {
        if (name === commandName) { cmdExists = true; break; }
      }
      if (!cmdExists) return reply(`Command "${commandName}" does not exist.`);

      for (const [name, cmd] of commands) {
        const allNames = [cmd.config?.name, ...(cmd.config?.aliases || [])].map(n => (n || "").toLowerCase());
        if (allNames.includes(alias)) return reply(`Alias "${alias}" conflicts with existing command "${name}".`);
      }

      if (isGlobal) {
        if (!isOwner) return reply("Only bot admin can add global aliases.");

        if (!global.NixBot.globalAliases) global.NixBot.globalAliases = {};
        if (global.NixBot.globalAliases[alias]) {
          return reply(`Global alias "${alias}" already exists for command "${global.NixBot.globalAliases[alias]}".`);
        }
        global.NixBot.globalAliases[alias] = commandName;
        global.NixBot.aliases.set(alias, commandName);
        return reply(`Added global alias "${alias}" for command "${commandName}".`);
      }

      if (!isGroup) return reply("Group aliases can only be set in groups. Use -g for global.");

      const threadData = await threadsData.get(chatId) || {};
      const groupAliases = threadData.groupAliases || {};

      if (groupAliases[alias]) {
        return reply(`Alias "${alias}" already exists for command "${groupAliases[alias]}" in this group.`);
      }

      groupAliases[alias] = commandName;
      await threadsData.set(chatId, { groupAliases });
      return reply(`Added alias "${alias}" for command "${commandName}" in this group.`);
    }

    if (sub === "remove" || sub === "rm") {
      if (!args[1] || !args[2]) return reply("Usage: setalias remove <alias> <command>");

      const alias = args[1].toLowerCase();
      const commandName = args[2].toLowerCase();
      const isGlobal = args[3] === "-g";

      if (isGlobal) {
        if (!isOwner) return reply("Only bot admin can remove global aliases.");

        if (!global.NixBot.globalAliases || !global.NixBot.globalAliases[alias]) {
          return reply(`Global alias "${alias}" does not exist.`);
        }
        if (global.NixBot.globalAliases[alias] !== commandName) {
          return reply(`Global alias "${alias}" is not for command "${commandName}".`);
        }
        delete global.NixBot.globalAliases[alias];
        global.NixBot.aliases.delete(alias);
        return reply(`Removed global alias "${alias}" for command "${commandName}".`);
      }

      if (!isGroup) return reply("Group aliases can only be removed in groups. Use -g for global.");

      const threadData = await threadsData.get(chatId) || {};
      const groupAliases = threadData.groupAliases || {};

      if (!groupAliases[alias]) {
        return reply(`Alias "${alias}" does not exist in this group.`);
      }
      if (groupAliases[alias] !== commandName) {
        return reply(`Alias "${alias}" is not for command "${commandName}" in this group.`);
      }

      delete groupAliases[alias];
      await threadsData.set(chatId, { groupAliases });
      return reply(`Removed alias "${alias}" for command "${commandName}" in this group.`);
    }

    if (sub === "list") {
      const isGlobal = args[1] === "-g";

      if (isGlobal) {
        const ga = global.NixBot.globalAliases || {};
        const entries = Object.entries(ga);
        if (!entries.length) return reply("No global aliases set.");

        const grouped = {};
        for (const [alias, cmd] of entries) {
          if (!grouped[cmd]) grouped[cmd] = [];
          grouped[cmd].push(alias);
        }
        let msg = "Global Aliases:\n";
        for (const [cmd, aliases] of Object.entries(grouped)) {
          msg += `\n${cmd}: ${aliases.join(", ")}`;
        }
        return reply(msg);
      }

      if (!isGroup) return reply("Use -g flag to list global aliases.");

      const threadData = await threadsData.get(chatId) || {};
      const groupAliases = threadData.groupAliases || {};
      const entries = Object.entries(groupAliases);
      if (!entries.length) return reply("No aliases set in this group.");

      const grouped = {};
      for (const [alias, cmd] of entries) {
        if (!grouped[cmd]) grouped[cmd] = [];
        grouped[cmd].push(alias);
      }
      let msg = "Group Aliases:\n";
      for (const [cmd, aliases] of Object.entries(grouped)) {
        msg += `\n${cmd}: ${aliases.join(", ")}`;
      }
      return reply(msg);
    }

    return reply("Usage: setalias add/remove/list\nType !help setalias for details.");
  }
};
