function getBanList() {
  if (!global.NixBot.controlData) global.NixBot.controlData = {};
  const ub = global.NixBot.controlData.userBan;
  if (!ub) {
    global.NixBot.controlData.userBan = [];
    return global.NixBot.controlData.userBan;
  }
  if (Array.isArray(ub)) return ub;
  if (typeof ub === "object" && ub.id) {
    global.NixBot.controlData.userBan = [ub];
    return global.NixBot.controlData.userBan;
  }
  global.NixBot.controlData.userBan = [];
  return global.NixBot.controlData.userBan;
}

function cleanId(id) {
  return (id || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

function isBanned(targetId) {
  const list = getBanList();
  return list.find(b => cleanId(b.id) === targetId) || null;
}

module.exports = {
  config: {
    name: "user",
    aliases: [],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 2,
    prefix: true,
    category: "owner",
    description: "Manage users in bot system",
    guide: {
      en: "{pn} ban <@tag | uid> <reason> - Ban user from using bot\n{pn} unban <@tag | uid> - Unban user\n{pn} banlist - Show all banned users\n{pn} info <@tag | uid> - Show user info"
    }
  },

  onStart: async function ({ sock, chatId, event, args, reply, isGroup }) {
    const sub = args[0]?.toLowerCase();

    if (!sub) {
      let msg = "User Commands:\n";
      msg += "1. user ban <@tag | uid> <reason>\n";
      msg += "2. user unban <@tag | uid>\n";
      msg += "3. user banlist\n";
      msg += "4. user info <@tag | uid>";
      return reply(msg);
    }

    const contextInfo = event.message?.extendedTextMessage?.contextInfo || {};
    const mentionedJids = contextInfo?.mentionedJid || [];
    const quotedParticipant = contextInfo?.participant || null;

    function getTargetId() {
      if (mentionedJids.length > 0) {
        return cleanId(mentionedJids[0]);
      }
      if (quotedParticipant) {
        return cleanId(quotedParticipant);
      }
      if (args[1]) {
        return args[1].replace(/[^0-9]/g, "");
      }
      return null;
    }

    function getTargetJid() {
      if (mentionedJids.length > 0) return mentionedJids[0];
      if (quotedParticipant) return quotedParticipant;
      if (args[1]) return args[1].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
      return null;
    }

    switch (sub) {
      case "ban":
      case "-b": {
        const targetId = getTargetId();
        if (!targetId) return reply("Uid of user to ban cannot be empty, please enter uid or tag or reply message of 1 user by user ban <uid> <reason>");

        let reason;
        if (mentionedJids.length > 0) {
          reason = args.slice(1).join(" ").replace(/@\d+/g, "").trim();
        } else if (quotedParticipant) {
          reason = args.slice(1).join(" ").trim();
        } else {
          reason = args.slice(2).join(" ").trim();
        }

        if (!reason) return reply("Reason to ban user cannot be empty, please enter uid or tag or reply message of 1 user by user ban <uid> <reason>");

        const banList = getBanList();
        const existing = isBanned(targetId);

        if (existing) {
          return reply(`User with id [${targetId} | ${existing.name || targetId}] has been banned before:\n» Reason: ${existing.reason || "No reason"}\n» Date: ${existing.date || "Unknown"}`);
        }

        const now = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" });

        let name = targetId;
        try {
          if (isGroup) {
            const groupMeta = await sock.groupMetadata(chatId);
            const p = groupMeta.participants.find(m => cleanId(m.id) === targetId);
            if (p) name = p.notify || p.verifiedName || targetId;
          }
        } catch (e) {}

        banList.push({ id: targetId, name, reason, date: now });

        return reply(`User with id [${targetId} | ${name}] has been banned:\n» Reason: ${reason}\n» Date: ${now}`);
      }

      case "unban":
      case "-u": {
        const targetId = getTargetId();
        if (!targetId) return reply("Uid of user to unban cannot be empty");

        const banList = getBanList();
        const idx = banList.findIndex(b => cleanId(b.id) === targetId);

        if (idx === -1) {
          return reply(`User with id [${targetId}] is not banned`);
        }

        const removed = banList.splice(idx, 1)[0];
        return reply(`User with id [${targetId} | ${removed.name || targetId}] has been unbanned`);
      }

      case "banlist": {
        const banList = getBanList();
        if (!banList.length) return reply("No banned users.");

        let msg = `📋 Banned Users (${banList.length}):\n`;
        for (const ban of banList) {
          const id = cleanId(ban.id);
          msg += `\n╭ ID: ${id}`;
          msg += `\n│ Name: ${ban.name || "Unknown"}`;
          msg += `\n│ Reason: ${ban.reason || "No reason"}`;
          msg += `\n╰ Date: ${ban.date || "Unknown"}\n`;
        }
        return reply(msg);
      }

      case "info": {
        if (!isGroup) return reply("This command can only be used in groups.");
        const targetId = getTargetId();
        if (!targetId) return reply("Please tag a user or provide uid.");

        try {
          const groupMeta = await sock.groupMetadata(chatId);
          const p = groupMeta.participants.find(m => cleanId(m.id) === targetId);

          if (!p) return reply(`❌ User ${targetId} not found in this group.`);

          const name = p.notify || p.verifiedName || "Unknown";
          const role = p.admin === "superadmin" ? "Super Admin" : p.admin === "admin" ? "Admin" : "Member";
          const banned = isBanned(targetId);

          let msg = `👤 User Info\n`;
          msg += `╭ Name: ${name}\n`;
          msg += `│ ID: ${targetId}\n`;
          msg += `│ Role: ${role}\n`;
          msg += `╰ Banned: ${banned ? "Yes" : "No"}`;
          return reply(msg);
        } catch (err) {
          console.error("[USER INFO ERROR]", err.message);
          return reply("❌ Failed to get user info.");
        }
      }

      default:
        return reply("Invalid subcommand. Use !user for help.");
    }
  }
};
