const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');

const REMOTE_PKG_URL = 'https://raw.githubusercontent.com/aryannix/Nix-Bot/main/package.json';
const LOCAL_PKG_PATH = path.join(process.cwd(), 'package.json');

module.exports = {
  config: {
    name: 'update',
    prefix: true,
    role: 3,
    category: 'owner',
    aliases: ['upgrade'],
    author: 'ArYAN',
    version: '1.0.0',
  },

  async onStart({ api, sock, chatId, msg, message, senderId }) {
    const react = (emoji) => api.sendMessage(chatId, { react: { text: emoji, key: msg?.key || message?.key } }).catch(() => {});

    try {
      await react('🔄');

      const localPkg = JSON.parse(await fs.readFile(LOCAL_PKG_PATH, 'utf8'));
      const { data: remotePkg } = await axios.get(REMOTE_PKG_URL, { timeout: 15000 });

      const localDeps = localPkg.dependencies || {};
      const remoteDeps = remotePkg.dependencies || {};

      const newPkgs = [];
      const updatedPkgs = [];
      const removedPkgs = [];

      for (const [pkg, ver] of Object.entries(remoteDeps)) {
        if (!localDeps[pkg]) {
          newPkgs.push({ name: pkg, version: ver });
        } else if (localDeps[pkg] !== ver) {
          updatedPkgs.push({ name: pkg, from: localDeps[pkg], to: ver });
        }
      }

      for (const pkg of Object.keys(localDeps)) {
        if (!remoteDeps[pkg]) {
          removedPkgs.push(pkg);
        }
      }

      const totalChanges = newPkgs.length + updatedPkgs.length + removedPkgs.length;

      if (totalChanges === 0) {
        await react('✅');
        return api.sendMessage(chatId, { text: `✅ All packages are up to date!\n\n📦 Local: v${localPkg.version}\n📦 Remote: v${remotePkg.version}` });
      }

      let text = `📦 *NixBot Package Update*\n`;
      text += `━━━━━━━━━━━━━━━━━━━\n`;
      text += `📦 Local: v${localPkg.version}\n`;
      text += `📦 Remote: v${remotePkg.version}\n`;
      text += `🔢 Changes: ${totalChanges}\n`;
      text += `━━━━━━━━━━━━━━━━━━━\n`;

      if (newPkgs.length > 0) {
        text += `\n➕ *New packages (${newPkgs.length}):*\n`;
        newPkgs.forEach(p => { text += `  + ${p.name} (${p.version})\n`; });
      }
      if (updatedPkgs.length > 0) {
        text += `\n✏️ *Updated packages (${updatedPkgs.length}):*\n`;
        updatedPkgs.forEach(p => { text += `  ~ ${p.name}: ${p.from} → ${p.to}\n`; });
      }
      if (removedPkgs.length > 0) {
        text += `\n🗑️ *Removed packages (${removedPkgs.length}):*\n`;
        removedPkgs.forEach(p => { text += `  - ${p}\n`; });
      }

      text += `\n━━━━━━━━━━━━━━━━━━━`;
      text += `\nReact 👍 to apply update`;
      text += `\nReact 👎 to cancel`;

      const sentMsg = await (sock || api).sendMessage(chatId, { text });

      global.NixBot.onReply.push({
        commandName: 'update',
        messageID: sentMsg.key.id,
        author: senderId,
        type: 'reactionUpdate',
        remotePkg: remotePkg,
        newPkgs,
        updatedPkgs,
        removedPkgs,
        chatId: chatId
      });

      await react('📦');

    } catch (e) {
      await react('❌');
      return api.sendMessage(chatId, { text: `❌ Failed to check updates.\n\n${e.message}` });
    }
  },

  async onReaction({ sock, chatId, message, senderId, reaction }) {
    if (!reaction || !reaction.key) return;

    const reactedMsgId = reaction.key.id;
    const emoji = reaction.text;

    const dataIndex = global.NixBot.onReply.findIndex(
      r => r.commandName === 'update' && r.messageID === reactedMsgId
    );
    if (dataIndex === -1) return;

    const data = global.NixBot.onReply[dataIndex];
    if (senderId !== data.author) return;

    global.NixBot.onReply.splice(dataIndex, 1);

    if (emoji === '👎' || emoji === '❌') {
      return sock.sendMessage(chatId, { text: '❌ Update cancelled.' });
    }

    if (emoji !== '👍' && emoji !== '✅') return;

    if (data.type === 'reactionRestart') {
      const restartFile = path.join(process.cwd(), 'database', 'restartTime.json');
      await fs.writeFile(restartFile, JSON.stringify({ start: Date.now(), jid: chatId }));
      await sock.sendMessage(chatId, { text: '♻️ Restarting bot now...' });
      process.exit(2);
      return;
    }

    await sock.sendMessage(chatId, { text: '⏳ Applying package update...' });

    try {
      const localPkg = JSON.parse(await fs.readFile(LOCAL_PKG_PATH, 'utf8'));
      const remotePkg = data.remotePkg;

      localPkg.dependencies = { ...remotePkg.dependencies };
      if (remotePkg.overrides) localPkg.overrides = remotePkg.overrides;
      localPkg.version = remotePkg.version;

      await fs.writeFile(LOCAL_PKG_PATH, JSON.stringify(localPkg, null, 2), 'utf8');

      const installPkgs = [];
      for (const p of data.newPkgs) installPkgs.push(`${p.name}@${p.version.replace(/[\^~]/g, '')}`);
      for (const p of data.updatedPkgs) installPkgs.push(`${p.name}@${p.to.replace(/[\^~]/g, '')}`);

      const removePkgs = data.removedPkgs || [];

      let results = [];
      let success = 0;
      let failed = 0;

      if (installPkgs.length > 0) {
        const installCmd = `npm install ${installPkgs.join(' ')} --legacy-peer-deps 2>&1`;
        const installResult = await new Promise((resolve) => {
          exec(installCmd, { cwd: process.cwd(), timeout: 120000 }, (err, stdout, stderr) => {
            resolve({ err, stdout, stderr });
          });
        });

        if (installResult.err) {
          results.push(`❌ Install error: ${installResult.err.message}`);
          failed += installPkgs.length;
        } else {
          for (const p of data.newPkgs) {
            results.push(`✅ Added: ${p.name} (${p.version})`);
            success++;
          }
          for (const p of data.updatedPkgs) {
            results.push(`✅ Updated: ${p.name}: ${p.from} → ${p.to}`);
            success++;
          }
        }
      }

      if (removePkgs.length > 0) {
        const removeCmd = `npm uninstall ${removePkgs.join(' ')} 2>&1`;
        const removeResult = await new Promise((resolve) => {
          exec(removeCmd, { cwd: process.cwd(), timeout: 60000 }, (err, stdout, stderr) => {
            resolve({ err, stdout, stderr });
          });
        });

        if (removeResult.err) {
          results.push(`❌ Remove error: ${removeResult.err.message}`);
          failed += removePkgs.length;
        } else {
          for (const p of removePkgs) {
            results.push(`✅ Removed: ${p}`);
            success++;
          }
        }
      }

      let text = `🔄 *NixBot Package Update Applied*\n`;
      text += `━━━━━━━━━━━━━━━━━━━\n`;
      text += `📦 Version: v${remotePkg.version}\n`;
      text += `✅ Success: ${success} | ❌ Failed: ${failed}\n`;
      text += `━━━━━━━━━━━━━━━━━━━\n\n`;
      text += results.join('\n');
      text += `\n\n♻️ React 👍 to restart bot now.`;

      const confirmMsg = await sock.sendMessage(chatId, { text });

      global.NixBot.onReply.push({
        commandName: 'update',
        messageID: confirmMsg.key.id,
        author: senderId,
        type: 'reactionRestart',
        chatId: chatId
      });

    } catch (e) {
      await sock.sendMessage(chatId, { text: `❌ Update failed: ${e.message}` });
    }
  },
};
