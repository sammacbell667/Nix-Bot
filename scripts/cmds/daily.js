const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "daily",
    aliases: ["claim"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    category: "game",
    nixPrefix: true,
    description: {
      en: "Receive daily gift"
    },
    guide: {
      en: "{pn}: Claim daily reward\n{pn} info: View daily gift information"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, usersData, args, reply }) {
    try {
      const userData = await usersData.get(senderId);
      const now = Date.now();
      const tz = "Asia/Dhaka";

      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      const baseReward = { coin: 500, exp: 10 };

      if (args[0] === "info") {
        let msg = "📋 𝐃𝐚𝐢𝐥𝐲 𝐑𝐞𝐰𝐚𝐫𝐝 𝐈𝐧𝐟𝐨\n\n";
        for (let i = 1; i <= 7; i++) {
          const dayIndex = i === 7 ? 0 : i;
          const getCoin = Math.floor(baseReward.coin * (1 + 20 / 100) ** (i - 1));
          const getExp = Math.floor(baseReward.exp * (1 + 20 / 100) ** (i - 1));
          msg += `${dayNames[dayIndex]}: ${getCoin.toLocaleString()} coin, ${getExp} exp\n`;
        }
        return reply(msg.trim());
      }

      const dateTime = moment.tz(tz).format("DD/MM/YYYY");
      const date = new Date();
      const currentDay = date.getDay();

      const lastTimeGetReward = userData.lastTimeGetReward || "";

      if (lastTimeGetReward === dateTime) {
        const nextClaim = moment().tz(tz).add(1, "day").startOf("day");
        const diff = nextClaim.valueOf() - now;
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return reply(`⏳ 𝐘𝐨𝐮 𝐡𝐚𝐯𝐞 𝐚𝐥𝐫𝐞𝐚𝐝𝐲 𝐫𝐞𝐜𝐞𝐢𝐯𝐞𝐝 𝐭𝐡𝐞 𝐠𝐢𝐟𝐭\n\nCome back in ${hours}h ${mins}m.`);
      }

      const dayMultiplier = (currentDay === 0 ? 7 : currentDay) - 1;
      const getCoin = Math.floor(baseReward.coin * (1 + 20 / 100) ** dayMultiplier);
      const getExp = Math.floor(baseReward.exp * (1 + 20 / 100) ** dayMultiplier);

      const currentMoney = Number(userData.money) || 0;
      const currentExp = Number(userData.exp) || 0;

      await usersData.set(senderId, {
        money: currentMoney + getCoin,
        exp: currentExp + getExp,
        lastTimeGetReward: dateTime,
        name: event.pushName || userData.name || "User"
      });

      let msg = `✅ 𝐃𝐚𝐢𝐥𝐲 𝐑𝐞𝐰𝐚𝐫𝐝 𝐂𝐥𝐚𝐢𝐦𝐞𝐝!\n\n`;
      msg += `📅 Day: ${dayNames[currentDay]}\n`;
      msg += `💰 Coins: +${getCoin.toLocaleString()}\n`;
      msg += `🌟 EXP: +${getExp}\n`;
      msg += `━━━━━━━━━━━━━━━━━━\n`;
      msg += `🏦 Balance: $${(currentMoney + getCoin).toLocaleString()}\n`;
      msg += `⭐ Total EXP: ${(currentExp + getExp).toLocaleString()}`;

      return reply(msg);

    } catch (e) {
      console.error("[DAILY] Error:", e.message);
      return reply("Error: " + e.message);
    }
  }
};
