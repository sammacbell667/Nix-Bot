const fs = require("fs");
const path = require("path");

const cacheDir = path.join(__dirname, "cache");
const tmpDir = path.join(__dirname, "tmp");

function clearFolder(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let count = 0;
  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      fs.unlinkSync(fullPath);
      count++;
    } else if (stat.isDirectory()) {
      count += clearFolder(fullPath);
    }
  }
  return count;
}

module.exports = {
  config: {
    name: "delete",
    aliases: ["d"],
    version: "1.0.0",
    author: "ArYAN",
    countDown: 1,
    role: 2,
    prefix: true,
    category: "owner",
    description: "Delete cache/temp files or delete a command file.",
    guide: {
      en: "{pn} — Clear all cache & temp files\n{pn} <cmdName> — Delete a command file"
    },
  },

  onStart: async function ({ sock, chatId, event, args, reply }) {
    const fileName = args[0];

    if (!fileName) {
      let total = 0;
      total += clearFolder(cacheDir);
      total += clearFolder(tmpDir);
      return reply(`✅ | Deleted all caches and temp files from the system 💻`);
    }

    let cmdFile = fileName;
    if (!cmdFile.endsWith(".js")) cmdFile += ".js";

    const filePath = path.join(__dirname, cmdFile);

    if (!fs.existsSync(filePath)) {
      return reply(`❎ | File not found: ${cmdFile}`);
    }

    const fullPath = path.resolve(filePath);
    const commands = global.NixBot.commands;
    const events = global.NixBot.eventCommands;

    try {
      const cached = require.cache[fullPath] ? require(fullPath) : null;
      if (cached?.config?.name) {
        commands.delete(cached.config.name);
        if (cached.config.aliases) {
          for (const alias of cached.config.aliases) {
            commands.delete(alias);
            global.NixBot.aliases.delete(alias);
          }
        }
        const evIdx = events.findIndex(e => e.config?.name === cached.config.name);
        if (evIdx !== -1) events.splice(evIdx, 1);
      }
      delete require.cache[fullPath];
    } catch (e) {}

    try {
      fs.unlinkSync(filePath);
      return reply(`✅ | Deleted successfully! ${cmdFile}`);
    } catch (err) {
      console.error("[DELETE ERROR]", err.message);
      return reply(`❎ | Failed to delete ${cmdFile}.`);
    }
  }
};
