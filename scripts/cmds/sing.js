const a = require("axios");
const b = require("fs");
const c = require("path");
const d = require("yt-search");

const nix = global.NixBot.apis.nixConfig;

module.exports = {
  config: {
    name: "sing",
    aliases: ["music", "song"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    shortDescription: "Sing tomake chai",
    longDescription: "Search and download music from YouTube",
    category: "MUSIC",
    guide: "/music <song name or YouTube URL>"
  },

  onStart: async function ({ sock: e, event: f, args: g, chatId: threadID }) {
    if (!g.length) return e.sendMessage(threadID, { text: "❌ Provide a song name or YouTube URL." }, { quoted: f });

    try {
        await e.sendMessage(threadID, { react: { text: "🎵", key: f.key } });
    } catch (e) {}

    let baseApi;
    const i = await e.sendMessage(threadID, { text: "🎵 Please wait..." }, { quoted: f });

    try {
      const configRes = await a.get(nix);
      baseApi = configRes.data && configRes.data.api;
      if (!baseApi) throw new Error("Configuration Error: Missing API in GitHub JSON.");
    } catch (error) {
      if (i && i.key) {
        try { await e.sendMessage(threadID, { delete: i.key }); } catch (err) {}
      }
      return e.sendMessage(threadID, { text: "❌ Failed to fetch API configuration from GitHub." }, { quoted: f });
    }

    let h = g.join(" ");

    try {
      let j;
      if (h.startsWith("http")) {
        j = h;
      } else {
        const k = await d(h);
        if (!k || !k.videos.length) throw new Error("No results found.");
        j = k.videos[0].url;
      }

      const l = `${baseApi}/play?url=${encodeURIComponent(j)}`;
      const m = await a.get(l);
      const n = m.data;

      if (!n.status || !n.downloadUrl) throw new Error("API failed to return download URL.");

      const o = `${n.title}.mp3`.replace(/[\\/:"*?<>|]/g, "");
      const p = c.join(process.cwd(), 'scripts', 'cmds', 'temp', o);

      const q = await a.get(n.downloadUrl, { responseType: "arraybuffer" });
      b.writeFileSync(p, q.data);

      await e.sendMessage(
        threadID,
        { 
            audio: b.readFileSync(p), 
            mimetype: 'audio/mpeg', 
            fileName: o,
            ptt: false // Set to true if you want it as a voice note
        },
        { quoted: f }
      );
      
      try {
          await e.sendMessage(threadID, { react: { text: "✅", key: f.key } });
      } catch (e) {}
      
      if (i && i.key) {
        try { await e.sendMessage(threadID, { delete: i.key }); } catch (err) {}
      }
      
      b.unlinkSync(p);

    } catch (r) {
      console.error(r);
      if (i && i.key) {
        try { await e.sendMessage(threadID, { delete: i.key }); } catch (err) {}
      }
      e.sendMessage(threadID, { text: `❌ Failed to download song: ${r.message}` }, { quoted: f });
      try {
          await e.sendMessage(threadID, { react: { text: "❌", key: f.key } });
      } catch (e) {}
    }
  }
};