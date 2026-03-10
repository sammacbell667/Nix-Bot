const os = require("os");
const fs = require("fs");

module.exports = {
  config: {
    name: "uptime",
    aliases: ["upt", "up"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    description: {
      en: "Show bot uptime and system information"
    },
    category: "utility",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ sock, chatId, event, reply }) {
    const now = Date.now();
    const botStart = global.NixBot.startTime || now;
    const botUpSec = Math.floor((now - botStart) / 1000);
    const botDays = Math.floor(botUpSec / 86400);
    const botHours = Math.floor((botUpSec % 86400) / 3600);
    const botMins = Math.floor((botUpSec % 3600) / 60);
    const botSecs = botUpSec % 60;
    const botUptimeStr = `${botDays}d ${botHours}h ${botMins}m ${botSecs}s`;

    const sysUpSec = Math.floor(os.uptime());
    const sysDays = Math.floor(sysUpSec / 86400);
    const sysHours = Math.floor((sysUpSec % 86400) / 3600);
    const sysMins = Math.floor((sysUpSec % 3600) / 60);
    const sysSecs = sysUpSec % 60;
    const sysUptimeStr = `${sysDays}d ${sysHours}h ${sysMins}m ${sysSecs}s`;

    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || "Unknown";
    const cpuCores = cpus.length;

    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    const usedRam = totalRam - freeRam;
    const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2) + " MB";

    let storageInfo = "N/A";
    try {
      const stat = fs.statfsSync("/");
      const totalStorage = stat.bsize * stat.blocks;
      const freeStorage = stat.bsize * stat.bavail;
      const usedStorage = totalStorage - freeStorage;
      const formatGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
      storageInfo = `${formatGB(usedStorage)} / ${formatGB(totalStorage)}`;
    } catch (e) {
      storageInfo = "N/A";
    }

    const dateNow = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });

    const platform = os.platform();
    const osType = os.type();
    const osRelease = os.release();

    const mem = process.memoryUsage();
    const heapUsed = formatMB(mem.heapUsed);
    const rss = formatMB(mem.rss);

    const pingStart = Date.now();
    await sock.sendPresenceUpdate("composing", chatId);
    const ping = Date.now() - pingStart;

    let msg = `⏱ 𝗨𝗣𝗧𝗜𝗠𝗘\n\n`;
    msg += `Bot Uptime: ${botUptimeStr}\n`;
    msg += `System Uptime: ${sysUptimeStr}\n\n`;
    msg += `CPU: ${cpuModel}\n`;
    msg += `Cores: ${cpuCores}\n\n`;
    msg += `RAM: ${formatMB(usedRam)} / ${formatMB(totalRam)}\n`;
    msg += `Free RAM: ${formatMB(freeRam)}\n\n`;
    msg += `Storage: ${storageInfo}\n\n`;
    msg += `OS: ${osType} ${osRelease}\n`;
    msg += `Platform: ${platform}\n\n`;
    msg += `Ping: ${ping}ms\n\n`;
    msg += `Memory (Bot Process):\n`;
    msg += `Heap: ${heapUsed}\n`;
    msg += `RSS: ${rss}\n\n`;
    msg += `Date: ${dateNow}`;

    await reply(msg);
  }
};
