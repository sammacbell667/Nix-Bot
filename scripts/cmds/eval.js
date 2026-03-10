module.exports = {
  config: {
    name: "eval",
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 3,
    description: "Test code quickly",
    category: "owner",
    guide: {
      en: "{pn} <code to test>"
    }
  },

  onStart: async function ({ sock, chatId, event, senderId, args, reply, usersData, isGroup }) {
    if (!args[0]) {
      return reply("Please provide code to evaluate.");
    }

    function output(msg) {
      if (typeof msg === "number" || typeof msg === "boolean" || typeof msg === "function")
        msg = msg.toString();
      else if (msg instanceof Map) {
        let text = `Map(${msg.size}) `;
        text += JSON.stringify(mapToObj(msg), null, 2);
        msg = text;
      }
      else if (typeof msg === "object")
        msg = JSON.stringify(msg, null, 2);
      else if (typeof msg === "undefined")
        msg = "undefined";
      reply(msg);
    }

    function out(msg) {
      output(msg);
    }

    function mapToObj(map) {
      const obj = {};
      map.forEach(function (v, k) {
        obj[k] = v;
      });
      return obj;
    }

    const code = args.join(" ");
    const cmd = `
    (async () => {
      try {
        ${code}
      } catch(err) {
        reply("❌ An error occurred:\\n" + (err.stack || JSON.stringify(err, null, 2) || err.message || "Unknown error"));
      }
    })()`;

    try {
      eval(cmd);
    } catch (err) {
      return reply("❌ An error occurred:\n" + (err.stack || err.message || "Unknown error"));
    }
  }
};
