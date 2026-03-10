module.exports = {
  config: {
    name: "rules",
    aliases: [],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    description: "Group rules management",
    category: "box chat",
    guide: {
      en: "{pn} - View group rules"
        + "\n{pn} add <rule> - Add a new rule"
        + "\n{pn} edit <n> <new content> - Edit rule number n"
        + "\n{pn} move <n1> <n2> - Swap rules n1 and n2"
        + "\n{pn} delete <n> - Delete rule number n"
        + "\n{pn} remove - Remove all rules"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, args, reply, isGroup, threadsData }) {
    if (!isGroup) return reply("This command can only be used in groups.");

    const { getPrefix } = global.utils;
    const prefix = getPrefix(chatId);

    const lang = {
      yourRules: "𝗚𝗿𝗼𝘂𝗽 𝗥𝘂𝗹𝗲𝘀\n\n%1",
      noRules: `This group has no rules yet.\nUse \`${prefix}rules add <rule>\` to add rules.`,
      noPermission: "Only group admins can manage rules.",
      noContent: "Please enter the content for the rule you want to add.",
      addSuccess: "✅ Added new rule successfully.",
      invalidNumber: "Please enter a valid rule number.",
      ruleNotExist: "Rule number %1 does not exist.",
      totalRules: "This group only has %1 rule(s).",
      noEditContent: "Please enter the new content for rule number %1.",
      editSuccess: "✅ Edited rule #%1 to: %2",
      invalidMove: "Please enter 2 rule numbers to swap.",
      moveSuccess: "✅ Swapped rule #%1 and #%2.",
      deleteSuccess: "✅ Deleted rule #%1: %2",
      confirmRemove: "⚠️ React to this message to confirm removing all group rules.",
      removeSuccess: "✅ Removed all group rules successfully."
    };

    const fmt = (str, ...vals) => {
      let r = str;
      vals.forEach((v, i) => { r = r.replace(`%${i + 1}`, v); });
      return r;
    };

    let isAdmin = false;
    try {
      const meta = await sock.groupMetadata(chatId);
      const participant = meta.participants.find(p => {
        if (p.id === senderId) return true;
        if (p.phoneNumber === senderId) return true;
        const pNum = (p.phoneNumber || p.id || "").split("@")[0].split(":")[0];
        const sNum = (senderId || "").split("@")[0].split(":")[0];
        return pNum === sNum;
      });
      isAdmin = !!participant?.admin;
    } catch (e) {}

    const threadData = await threadsData.get(chatId);
    const rules = threadData.rules || [];
    const type = args[0]?.toLowerCase();

    if (!type) {
      if (rules.length === 0) return reply(lang.noRules);
      let msg = rules.map((r, i) => `${i + 1}. ${r}`).join("\n");
      return reply(fmt(lang.yourRules, msg));
    }

    if (["add", "-a"].includes(type)) {
      if (!isAdmin) return reply(lang.noPermission);
      if (!args[1]) return reply(lang.noContent);
      rules.push(args.slice(1).join(" "));
      await threadsData.set(chatId, { rules });
      return reply(lang.addSuccess);
    }

    if (["edit", "-e"].includes(type)) {
      if (!isAdmin) return reply(lang.noPermission);
      const n = parseInt(args[1]);
      if (isNaN(n)) return reply(lang.invalidNumber);
      if (!rules[n - 1]) {
        return reply(fmt(lang.ruleNotExist, n) + " " + (rules.length === 0 ? lang.noRules : fmt(lang.totalRules, rules.length)));
      }
      if (!args[2]) return reply(fmt(lang.noEditContent, n));
      const newContent = args.slice(2).join(" ");
      rules[n - 1] = newContent;
      await threadsData.set(chatId, { rules });
      return reply(fmt(lang.editSuccess, n, newContent));
    }

    if (["move", "-m"].includes(type)) {
      if (!isAdmin) return reply(lang.noPermission);
      const n1 = parseInt(args[1]);
      const n2 = parseInt(args[2]);
      if (isNaN(n1) || isNaN(n2)) return reply(lang.invalidMove);
      if (!rules[n1 - 1] || !rules[n2 - 1]) {
        const missing = !rules[n1 - 1] && !rules[n2 - 1]
          ? fmt(lang.ruleNotExist, `${n1} & ${n2}`)
          : fmt(lang.ruleNotExist, !rules[n1 - 1] ? n1 : n2);
        return reply(missing + " " + (rules.length === 0 ? lang.noRules : fmt(lang.totalRules, rules.length)));
      }
      [rules[n1 - 1], rules[n2 - 1]] = [rules[n2 - 1], rules[n1 - 1]];
      await threadsData.set(chatId, { rules });
      return reply(fmt(lang.moveSuccess, n1, n2));
    }

    if (["delete", "del", "-d"].includes(type)) {
      if (!isAdmin) return reply(lang.noPermission);
      const n = parseInt(args[1]);
      if (isNaN(n)) return reply(lang.invalidNumber);
      if (!rules[n - 1]) {
        return reply(fmt(lang.ruleNotExist, n) + " " + (rules.length === 0 ? lang.noRules : fmt(lang.totalRules, rules.length)));
      }
      const removed = rules.splice(n - 1, 1)[0];
      await threadsData.set(chatId, { rules });
      return reply(fmt(lang.deleteSuccess, n, removed));
    }

    if (["remove", "reset", "-r", "-rm"].includes(type)) {
      if (!isAdmin) return reply(lang.noPermission);
      await threadsData.set(chatId, { rules: [] });
      return reply(lang.removeSuccess);
    }

    if (!isNaN(type)) {
      const nums = args.map(a => parseInt(a)).filter(n => !isNaN(n));
      let msg = "";
      for (const n of nums) {
        if (rules[n - 1]) msg += `${n}. ${rules[n - 1]}\n`;
      }
      if (!msg) {
        return reply(fmt(lang.ruleNotExist, type) + " " + (rules.length === 0 ? lang.noRules : fmt(lang.totalRules, rules.length)));
      }
      return reply(msg.trim());
    }

    return reply(`Invalid option. Use \`${prefix}rules\` to see usage.`);
  }
};
