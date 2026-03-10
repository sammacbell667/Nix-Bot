module.exports = {
  config: {
    name: "slots",
    aliases: ["slot"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    description: "Slots game with rules and limits",
    category: "game",
    guide: {
      en: "{pn} <amount> | all | half | rules"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, usersData, args, reply }) {
    try {
      const userData = await usersData.get(senderId);
      const userName = event.pushName || userData.name || "User";
      const userBalance = Number(userData.money) || 0;

      const MIN_BALANCE = 1000;
      const MAX_BET = 6000000;
      const DAILY_LIMIT = 50;
      const hearts = ["❤️", "🧡", "💛", "💚", "🩵", "💙", "💜", "🤎", "🖤", "🩶", "🤍", "🩷"];

      const formatMoney = (amount) => {
        if (amount >= 1e6) return `${(amount / 1e6).toFixed(0)}M`;
        if (amount >= 1e3) return `${(amount / 1e3).toFixed(0)}K`;
        return amount.toLocaleString();
      };

      const input = args[0]?.toLowerCase();

      if (input === "rules") {
        return reply(
          `🎰 𝐒𝐥𝐨𝐭 𝐆𝐚𝐦𝐞 𝐑𝐮𝐥𝐞𝐬 🎰\n\n` +
          `1⃣ 𝐁𝐞𝐭 𝐋𝐢𝐦𝐢𝐭: 𝙼𝚊𝚡𝚒𝚖𝚞𝚖 𝚋𝚎𝚝 𝚒𝚜 $6,000,000(6M). 𝙰𝚗𝚢 𝚊𝚖𝚘𝚞𝚗𝚝 𝚎𝚡𝚌𝚎𝚎𝚍𝚒𝚗𝚐 𝚝𝚑𝚒𝚜 𝚠𝚒𝚕𝚕 𝚋𝚎 𝚌𝚘𝚗𝚜𝚒𝚍𝚎𝚛𝚎𝚍 𝚒𝚗𝚟𝚊𝚕𝚒𝚍.\n\n` +
          `2⃣ 𝐋𝐢𝐦𝐢𝐭𝐬: 𝙽𝚘 𝚌𝚘𝚗𝚝𝚒𝚗𝚞𝚘𝚞𝚜 𝚊𝚞𝚝𝚘𝚖𝚊𝚝𝚎𝚍 𝚜𝚙𝚒𝚗𝚜. 𝙼𝚊𝚡𝚒𝚖𝚞𝚖 𝚊𝚝𝚝𝚎𝚖𝚙𝚝𝚜 𝚒𝚜 𝟻𝟶 𝚙𝚎𝚛 𝚍𝚊𝚢. 𝙴𝚗𝚓𝚘𝚢 𝚛𝚎𝚜𝚙𝚘𝚗𝚜𝚒𝚋𝚕𝚢!\n\n` +
          `❗ 𝙱𝚛𝚎𝚊𝚔𝚒𝚗𝚐 𝚊𝚗𝚢 𝚘𝚏 𝚝𝚑𝚎𝚜𝚎 𝚛𝚞𝚕𝚎𝚜 𝚖𝚊𝚢 𝚕𝚎𝚊𝚍 𝚝𝚘 𝚊 𝚙𝚎𝚗𝚊𝚕𝚝𝚢, 𝚒𝚗𝚌𝚕𝚞𝚍𝚒𝚗𝚐 𝚕𝚘𝚜𝚜 𝚘𝚏 𝚖𝚘𝚗𝚎𝚢 𝚘𝚛 𝚛𝚎𝚜𝚝𝚛𝚒𝚌𝚝𝚒𝚘𝚗 𝚏𝚛𝚘𝚖 𝚝𝚑𝚎 𝚐𝚊𝚖𝚎.\n` +
          `𝙶𝚘𝚘𝚍 𝚕𝚞𝚌𝚔 𝚊𝚗𝚍 𝚑𝚊𝚟𝚎 𝚏𝚞𝚗! 🍀`
        );
      }

      const stats = userData.data?.slotsStats || {
        lastPlayDay: "", dailySpins: 0, dailyWins: 0, seenRules: false
      };

      if (!input) {
        return reply("𝐏𝐥𝐞𝐚𝐬𝐞 𝐚𝐝𝐝 𝐚𝐧 𝐚𝐦𝐨𝐮𝐧𝐭 𝐨𝐫 𝐫𝐮𝐥𝐞𝐬 𝐭𝐨 𝐬𝐞𝐞 𝐠𝐚𝐦𝐞 𝐫𝐮𝐥𝐞𝐬");
      }

      if (userBalance < MIN_BALANCE) {
        if (!stats.seenRules) {
          await reply(`⚠ 𝐇𝐞𝐲 ${userName}, 𝐭𝐡𝐢𝐬 𝐥𝐨𝐨𝐤𝐬 𝐥𝐢𝐤𝐞 𝐲𝐨𝐮𝐫 𝐟𝐢𝐫𝐬𝐭 𝐭𝐢𝐦𝐞 𝐩𝐥𝐚𝐲𝐢𝐧𝐠 𝐒𝐥𝐨𝐭𝐬!\n📜 𝐏𝐥𝐞𝐚𝐬𝐞 𝐫𝐞𝐚𝐝 𝐭𝐡𝐞 𝐫𝐮𝐥𝐞𝐬 𝐮𝐬𝐢𝐧𝐠: 𝐬𝐥𝐨𝐭 𝐫𝐮𝐥𝐞𝐬\n🚫 𝐌𝐚𝐱 𝐛𝐞𝐭 𝐢𝐬 $𝟔,𝟎𝟎𝟎,𝟎𝟎𝟎 — 𝐠𝐨𝐢𝐧𝐠 𝐨𝐯𝐞𝐫 𝐦𝐚𝐲 𝐫𝐞𝐬𝐮𝐥𝐭 𝐢𝐧 𝐩𝐞𝐧𝐚𝐥𝐭𝐢𝐞𝐬.`);
          await new Promise(res => setTimeout(res, 2000));
        }
        return reply(`❌ 𝐘𝐨𝐮 𝐧𝐞𝐞𝐝 𝐚𝐭 𝐥𝐞𝐚𝐬𝐭 $${formatMoney(MIN_BALANCE)} 𝐛𝐚𝐥𝐚𝐧𝐜𝐞 𝐭𝐨 𝐩𝐥𝐚𝐲 𝐬𝐥𝐨𝐭𝐬.\n💰 𝐘𝐨𝐮𝐫 𝐛𝐚𝐥𝐚𝐧𝐜𝐞: $${formatMoney(userBalance)}`);
      }

      let bet = 0;
      if (input === "all") bet = Math.min(userBalance, MAX_BET);
      else if (input === "half") bet = Math.min(Math.floor(userBalance / 2), MAX_BET);
      else bet = parseInt(input);

      if (isNaN(bet) || bet <= 0) {
        return reply("𝐏𝐥𝐞𝐚𝐬𝐞 𝐚𝐝𝐝 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐚𝐦𝐨𝐮𝐧𝐭.");
      }

      if (bet > MAX_BET) {
        return reply(`🚫 𝐌𝐚𝐱 𝐛𝐞𝐭 𝐢𝐬 $𝟔,𝟎𝟎𝟎,𝟎𝟎𝟎 — 𝐠𝐨𝐢𝐧𝐠 𝐨𝐯𝐞𝐫 𝐦𝐚𝐲 𝐫𝐞𝐬𝐮𝐥𝐭 𝐢𝐧 𝐩𝐞𝐧𝐚𝐥𝐭𝐢𝐞𝐬.`);
      }

      if (bet > userBalance) {
        return reply(`❌ 𝐘𝐨𝐮 𝐝𝐨𝐧'𝐭 𝐡𝐚𝐯𝐞 𝐞𝐧𝐨𝐮𝐠𝐡 𝐦𝐨𝐧𝐞𝐲 𝐭𝐨 𝐩𝐥𝐚𝐜𝐞 𝐚 $${formatMoney(bet)} 𝐛𝐞𝐭.`);
      }

      const today = new Date().toLocaleDateString("en-CA");
      if (stats.lastPlayDay !== today) {
        stats.dailySpins = 0;
        stats.dailyWins = 0;
        stats.lastPlayDay = today;
      }

      if (stats.dailySpins >= DAILY_LIMIT) {
        return reply(`🚫 𝐋𝐢𝐦𝐢𝐭𝐬: 𝙼𝚊𝚡𝚒𝚖𝚞𝚖 𝚊𝚝𝚝𝚎𝚖𝚙𝚝𝚜 𝚒𝚜 𝟻𝟶 𝚙𝚎𝚛 𝚍𝚊𝚢. 𝙲𝚘𝚖𝚎 𝚋𝚊𝚌𝚔 𝚝𝚘𝚖𝚘𝚛𝚛𝚘𝚠!`);
      }

      const slot1 = hearts[Math.floor(Math.random() * hearts.length)];
      const slot2 = hearts[Math.floor(Math.random() * hearts.length)];
      const slot3 = hearts[Math.floor(Math.random() * hearts.length)];

      let winnings = 0;
      let isWin = false;

      if (slot1 === slot2 && slot2 === slot3) {
        winnings = bet * 10;
        isWin = true;
      } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
        winnings = bet * 2;
        isWin = true;
      } else {
        winnings = -bet;
        isWin = false;
      }

      const newBalance = userBalance + (isWin ? winnings : -bet);
      stats.dailySpins += 1;
      if (isWin) stats.dailyWins += 1;
      stats.seenRules = true;

      await usersData.set(senderId, {
        money: newBalance,
        data: { ...userData.data, slotsStats: stats },
        name: userName
      });

      const winRate = ((stats.dailyWins / stats.dailySpins) * 100).toFixed(1);

      const statusText = isWin
        ? `• 𝐁𝐚𝐛𝐲, 𝐲𝐨𝐮 𝐰𝐨𝐧 $${formatMoney(winnings)}`
        : `• 𝐁𝐚𝐛𝐲, 𝐲𝐨𝐮 𝐥𝐨𝐬𝐭 $${formatMoney(bet)}`;

      const response =
        `${statusText}\n` +
        `• 𝐆𝐚𝐦𝐞 𝐑𝐞𝐬𝐮𝐥𝐭𝐬: [ ${slot1} | ${slot2} | ${slot3} ]\n` +
        `🎯 𝐖𝐢𝐧 𝐑𝐚𝐭𝐞 𝐓𝐨𝐝𝐚𝐲: ${winRate}% (${stats.dailyWins}/${stats.dailySpins})`;

      return reply(response);

    } catch (e) {
      console.error("[SLOT] Error:", e.message);
      return reply("❌ 𝐒𝐲𝐬𝐭𝐞𝐦 𝐄𝐫𝐫𝐨𝐫.");
    }
  }
};
