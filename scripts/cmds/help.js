module.exports = {
  config: {
    name: 'help',
    prefix: true,
    role: 0,
    category: 'utility',
    aliases: ['commands'],
    author: 'ArYAN',
    version: '0.0.2',
  },

  async onStart({ api, chatId, args, cmds, prefix }) {
    const commands = cmds;

    if (args.length) {
      const query = args[0].toLowerCase();
      let cmd = commands.get(query);

      if (!cmd) {
        for (const [, c] of commands) {
          if (c.config.aliases?.includes(query)) {
            cmd = c;
            break;
          }
        }
      }

      if (!cmd) return await api.sendMessage(chatId, { text: `No command called "${query}".` });

      const info = cmd.config;

      const roleLabels = {
        0: "Everyone",
        1: "Group Admin",
        2: "Bot Admin / Sudo",
        3: "Owner Only"
      };
      const roleText = roleLabels[info.role] || `Role ${info.role}`;

      const nixPrefixText = info.nixPrefix === false ? "false" : "true";

      const descText = typeof info.description === "object"
        ? (info.description.en || "No description")
        : (info.description || "No description");

      const guideText = typeof info.guide === "object"
        ? (info.guide.en || "No guide available")
        : (info.guide || "No guide available");

      const usageGuide = guideText.replace(/\{pn\}/g, `${prefix}${info.name}`).replace(/\{p\}/g, prefix);

      const cooldown = info.countDown || info.coolDown || 0;

      let detail = `╭──── 〔 ${info.name.toUpperCase()} 〕 ────◊\n`;
      detail += `│\n`;
      detail += `│ Name: ${info.name}\n`;
      detail += `│ Aliases: ${info.aliases?.length ? info.aliases.join(', ') : 'None'}\n`;
      detail += `│ Category: ${(info.category || 'uncategorized').toUpperCase()}\n`;
      detail += `│ Permission: ${roleText}\n`;
      detail += `│ Role: ${info.role}\n`;
      detail += `│ NixPrefix: ${nixPrefixText}\n`;
      detail += `│ Cooldown: ${cooldown}s\n`;
      detail += `│ Version: ${info.version || 'N/A'}\n`;
      detail += `│ Author: ${info.author || 'Unknown'}\n`;
      detail += `│\n`;
      detail += `│ Description:\n`;
      detail += `│ ${descText}\n`;
      detail += `│\n`;
      detail += `│ Usage:\n`;
      detail += `│ ${usageGuide}\n`;
      detail += `│\n`;
      detail += `╰─────────────────────◊`;

      return await api.sendMessage(chatId, { text: detail });
    }

    const cats = {};
    const uniqueCommands = new Set();

    for (const [name, cmd] of commands) {
      if (uniqueCommands.has(cmd.config.name)) continue;
      uniqueCommands.add(cmd.config.name);

      const cat = cmd.config.category || 'UNCATEGORIZED';
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(cmd.config.name);
    }

    let msg = '';
    Object.keys(cats).sort().forEach(cat => {
      msg += `╭─────『 ${cat.toUpperCase()} 』\n`;
      cats[cat].sort().forEach(n => {
        msg += `│ ▸ ${n}\n`;
      });
      msg += `╰──────────────\n`;
    });

    msg += `\n╭──────────────◊\n`;
    msg += `│ » Total commands: ${uniqueCommands.size}\n`;
    msg += `│ » Prefix: ${prefix}\n`;
    msg += `│ » Type ${prefix}help <cmd> for details\n`;
    msg += `│ » A Powerful Whatsapp Bot\n`;
    msg += `│ » Aryan Rayhan\n`;
    msg += `╰──────────◊\n`;
    msg += `「 NixBot 」`;

    await api.sendMessage(chatId, { text: msg });
  }
};
