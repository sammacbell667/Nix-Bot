const moment = require("moment-timezone");

const cleanUid = (uid) => uid.split(":")[0].split("@")[0];

module.exports = {
  config: {
    name: "balance",
    aliases: ["bal"],
    version: "1.2.0",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    description: {
      en: "Check balance, top users, or transfer money"
    },
    category: "economy",
    guide: {
      en: "{pn} | {pn} top | {pn} -t [amount] [reply/mention]"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, usersData, args, reply, isGroup }) {
    try {
      const formatFont = (str) => {
        const map = {
          'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣', 'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭', 'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
          'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉', 'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓', 'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
          '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
        };
        return str.split('').map(c => map[c] || c).join('');
      };

      const formatMoney = (num) => {
        if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
      };

      let groupParticipants = null;
      if (isGroup) {
        try {
          const meta = await sock.groupMetadata(chatId);
          groupParticipants = meta.participants;
        } catch (e) {}
      }

      const resolveJid = (uid) => {
        const clean = cleanUid(uid);
        if (groupParticipants) {
          for (const p of groupParticipants) {
            if (cleanUid(p.id) === clean) return p.id;
          }
        }
        if (uid.includes("@")) return uid;
        return `${clean}@s.whatsapp.net`;
      };

      if (args[0] === "top") {
        const allUsers = await usersData.getAll();
        const topUsers = allUsers
          .sort((a, b) => (Number(b.money) || 0) - (Number(a.money) || 0))
          .slice(0, 30);

        let topMsg = formatFont("Top 30 Richest Users:") + "\n";
        topUsers.forEach((user, index) => {
          const uName = user.name || "Unknown";
          const uMoney = formatFont(formatMoney(Number(user.money) || 0));
          topMsg += `${formatFont((index + 1).toString())}. ${uName}: $${uMoney}\n`;
        });
        return reply(topMsg);
      }

      if (args[0] === "-t" || args[0] === "transfer") {
        const transferAmount = parseInt(args[1]);
        if (isNaN(transferAmount) || transferAmount <= 0) return reply(formatFont("Please enter a valid amount to transfer."));

        let receiverID;
        const mentionedJid = event.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const quotedParticipant = event.message?.extendedTextMessage?.contextInfo?.participant;

        if (quotedParticipant) {
          receiverID = quotedParticipant;
        } else if (mentionedJid) {
          receiverID = mentionedJid;
        }

        if (!receiverID) return reply(formatFont("Please reply or mention the user you want to transfer money to."));
        if (cleanUid(receiverID) === cleanUid(senderId)) return reply(formatFont("You cannot transfer money to yourself."));

        const senderData = await usersData.get(senderId);
        const senderMoney = Number(senderData.money) || 0;

        if (senderMoney < transferAmount) return reply(formatFont("You don't have enough balance."));

        const receiverData = await usersData.get(receiverID);
        const vat = Math.floor(transferAmount * 0.02);
        const finalAmount = transferAmount - vat;

        await usersData.set(senderId, { money: senderMoney - transferAmount });
        await usersData.set(receiverID, { money: (Number(receiverData.money) || 0) + finalAmount });

        const txnID = "TXN" + Math.floor(Math.random() * 1e15);
        const time = moment.tz("Asia/Dhaka").format("M/D/YYYY, h:mm:ss A");

        const senderName = senderData.name || event.pushName || "User";
        const receiverName = receiverData.name || "User";

        const msg = `${formatFont("Transfer Successful!")}\n${formatFont("From")}: ${senderName}\n${formatFont("To")}: ${receiverName}\n${formatFont("Amount")}: $${formatFont(formatMoney(transferAmount))}\n${formatFont("VAT (2%)")}: $${formatFont(formatMoney(vat))}\n${formatFont("Received")}: $${formatFont(formatMoney(finalAmount))}\n${formatFont("Transaction ID")}: ${formatFont(txnID)}\n${formatFont("Time")}: ${formatFont(time)}`;

        return reply(msg);
      }

      let targetID = senderId;
      let isOther = false;
      let targetName = event.pushName || "User";

      const quotedParticipant = event.message?.extendedTextMessage?.contextInfo?.participant;
      const mentionedJid = event.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

      if (quotedParticipant) {
        targetID = quotedParticipant;
        isOther = true;
      } else if (mentionedJid) {
        targetID = mentionedJid;
        isOther = true;
      }

      const targetData = await usersData.get(targetID);

      if (!isOther) {
        await usersData.set(senderId, { name: targetName });
      }

      const targetMoney = Math.floor(Number(targetData.money) || 0);
      const emojis = ["😒", "😀", "🥵", "🍫", "🙂", "💋", "🤓", "😎", "😛"];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

      const senderName = formatFont(event.pushName || targetData.name || "User");
      const formattedBalance = formatFont(formatMoney(targetMoney));

      let response;
      if (isOther && cleanUid(targetID) !== cleanUid(senderId)) {
        const otherName = formatFont(targetData.name || "User");
        response = `${formatFont("Hey,")} ${senderName}! ${randomEmoji}\n\n${otherName}${formatFont("'s current balance is")} $${formattedBalance}.`;
      } else {
        response = `${formatFont("Hey,")} ${senderName}! ${randomEmoji}\n\n${formatFont("Your current balance is")} $${formattedBalance}.`;
      }

      return reply(response);

    } catch (e) {
      console.error("[BALANCE] Error:", e.message);
      return reply("Error: " + e.message);
    }
  }
};
