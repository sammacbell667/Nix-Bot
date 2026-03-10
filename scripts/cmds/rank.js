const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');
const path = require('path');

const FONTS_DIR = path.join(__dirname, 'assets', 'fonts');
let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  try {
    registerFont(path.join(FONTS_DIR, 'Bold.ttf'), { family: 'Poppins', weight: 'bold' });
    registerFont(path.join(FONTS_DIR, 'SemiBold.ttf'), { family: 'Poppins', weight: '600' });
    registerFont(path.join(FONTS_DIR, 'Regular.ttf'), { family: 'Poppins' });
    fontsRegistered = true;
  } catch (e) {
    console.error('[RANK] Font registration error:', e.message);
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'number') radius = { tl: radius, tr: radius, br: radius, bl: radius };
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
}

function createDefaultAvatar() {
  const size = 256;
  const c = createCanvas(size, size);
  const cx = c.getContext('2d');
  const grad = cx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#00FFAA');
  grad.addColorStop(1, '#0088FF');
  cx.fillStyle = grad;
  cx.fillRect(0, 0, size, size);
  cx.fillStyle = '#ffffff';
  cx.beginPath();
  cx.arc(size / 2, size * 0.36, size * 0.2, 0, Math.PI * 2);
  cx.fill();
  cx.beginPath();
  cx.arc(size / 2, size * 0.95, size * 0.35, 0, Math.PI, true);
  cx.fill();
  return c;
}

async function loadAvatar(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image').catch(() => null);
    if (url && typeof url === 'string') {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
      return await loadImage(Buffer.from(res.data));
    }
  } catch (e) {}
  return createDefaultAvatar();
}

module.exports = {
  config: {
    name: 'rank',
    prefix: true,
    role: 0,
    category: 'utility',
    aliases: ['level'],
    author: 'ArYAN',
    version: '1.0.0',
    countDown: 5,
    description: { en: 'Display user rank card or leaderboard' },
    guide: { en: '{pn} [@user] | {pn} top [number]' },
  },

  async onStart({ sock, api, chatId, args, senderId, event, message, usersData, isGroup, reply }) {
    registerFonts();

    const msg = event || message;
    const command = args[0]?.toLowerCase();

    if (!isGroup) return reply('❌ This command can only be used in groups.');

    try {
      const groupMeta = await sock.groupMetadata(chatId).catch(() => ({ participants: [], subject: 'Unknown Group' }));
      const participants = groupMeta.participants || [];

      const allUserData = await usersData.getAll();
      const userMap = {};
      for (const u of allUserData) {
        const cleanId = (u.id || u.senderID || '').split(':')[0].split('@')[0];
        if (cleanId) userMap[cleanId] = u;
      }

      const users = participants.map(p => {
        const cleanId = p.id.split(':')[0].split('@')[0];
        const userData = userMap[cleanId] || {};
        const msgCount = Number(userData.msgCount) || Number(userData.exp) || 0;
        const money = Number(userData.money) || 0;
        const name = userData.name || p.notify || cleanId;
        return { jid: p.id, msgCount, money, name, cleanId };
      });

      users.sort((a, b) => b.msgCount - a.msgCount);

      if (command === 'top' || command === 'leaderboard') {
        const topCount = Math.min(parseInt(args[1]) || 10, 20);
        const topUsers = users.slice(0, topCount);
        await generateTopCard(sock, msg, topUsers, groupMeta.subject, topCount, chatId);
        return;
      }

      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const targetJid = mentionedJid || quotedParticipant || senderId;
      const targetClean = targetJid.split(':')[0].split('@')[0];

      const rankIndex = users.findIndex(u => u.cleanId === targetClean);
      const userRank = rankIndex !== -1 ? rankIndex + 1 : users.length;
      const userEntry = rankIndex !== -1 ? users[rankIndex] : { msgCount: 0, money: 0, name: msg.pushName || 'User' };

      const targetName = (targetJid === senderId && msg.pushName) ? msg.pushName : userEntry.name;
      const msgCount = userEntry.msgCount;
      const level = Math.floor(Math.sqrt(msgCount / 5));
      const requiredXP = Math.pow(level + 1, 2) * 5;

      await generateRankCard(sock, msg, targetJid, userRank, users.length, level, msgCount, requiredXP, targetName, chatId);

    } catch (error) {
      console.error('[RANK] Error:', error);
      return reply('❌ Error generating rank card.');
    }
  },
};

async function generateRankCard(sock, msg, targetJid, userRank, totalUsers, level, currentXP, requiredXP, targetName, chatId) {
  const avatarImg = await loadAvatar(sock, targetJid);

  const width = 1600;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
  bgGradient.addColorStop(0, '#1a0066');
  bgGradient.addColorStop(0.3, '#0d0033');
  bgGradient.addColorStop(0.6, '#001a33');
  bgGradient.addColorStop(1, '#000a1a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff08';
  for (let i = 0; i < 80; i++) {
    const x = (i * 37) % width;
    const y = Math.sin(i * 0.3) * 40 + height / 2;
    const size = Math.sin(i * 0.5) * 2 + 2;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff18';
  ctx.strokeStyle = '#ffffff35';
  ctx.lineWidth = 3;
  roundRect(ctx, 25, 25, width - 50, height - 50, 40);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#00ffaa25';
  ctx.lineWidth = 1;
  roundRect(ctx, 27, 27, width - 54, height - 54, 38);
  ctx.stroke();

  const avatarSize = 220;
  const avatarX = 70;
  const avatarY = (height / 2) - (avatarSize / 2);

  for (let i = 0; i < 3; i++) {
    ctx.shadowColor = '#00FFAA';
    ctx.shadowBlur = 40 - (i * 10);
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 15 - (i * 5), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 255, 170, ${0.08 - i * 0.02})`;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  const avatarBorderGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
  avatarBorderGrad.addColorStop(0, '#00FFAA');
  avatarBorderGrad.addColorStop(0.5, '#00DDFF');
  avatarBorderGrad.addColorStop(1, '#0088FF');
  ctx.strokeStyle = avatarBorderGrad;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  let displayName = targetName.length > 20 ? targetName.substring(0, 17) + '...' : targetName;
  const uid = targetJid.split(':')[0].split('@')[0];
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 62px "Poppins"';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(displayName, width / 2, 100);
  ctx.shadowBlur = 0;

  ctx.font = '26px Poppins';
  ctx.fillStyle = '#999999';
  ctx.fillText(`UID: ${uid}`, width / 2, 155);

  const levelGrad = ctx.createLinearGradient(width - 300, 80, width - 100, 120);
  levelGrad.addColorStop(0, '#00FFAA');
  levelGrad.addColorStop(0.5, '#00DDFF');
  levelGrad.addColorStop(1, '#0088FF');

  ctx.font = 'bold 58px "Poppins"';
  ctx.textAlign = 'right';
  ctx.fillStyle = levelGrad;
  ctx.shadowColor = '#00FFAA';
  ctx.shadowBlur = 15;
  ctx.fillText(`Level ${level}`, width - 120, 120);
  ctx.shadowBlur = 0;

  ctx.font = '600 55px "Poppins"';
  ctx.fillStyle = levelGrad;
  ctx.textAlign = 'center';
  ctx.shadowColor = '#00FFAA';
  ctx.shadowBlur = 10;
  ctx.fillText(`${userRank}/${totalUsers}`, width - 180, height - 100);
  ctx.shadowBlur = 0;

  const lineY = height / 2 + 10;
  const lineGrad = ctx.createLinearGradient(avatarX + avatarSize + 50, lineY, width - 200, lineY);
  lineGrad.addColorStop(0, 'rgba(0,255,170,0)');
  lineGrad.addColorStop(0.1, 'rgba(0,255,170,0.4)');
  lineGrad.addColorStop(0.5, 'rgba(0,255,170,1)');
  lineGrad.addColorStop(0.9, 'rgba(0,128,255,0.4)');
  lineGrad.addColorStop(1, 'rgba(0,128,255,0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(avatarX + avatarSize + 50, lineY);
  ctx.lineTo(width - 200, lineY);
  ctx.stroke();

  const barWidth = 900;
  const barHeight = 40;
  const barX = (width / 2) - (barWidth / 2);
  const barY = height - 130;
  const progress = Math.min(currentXP / requiredXP, 1);

  ctx.font = '600 40px "Poppins"';
  ctx.fillStyle = '#E8E8E8';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.fillText(`EXP: ${currentXP.toLocaleString()} / ${requiredXP.toLocaleString()}`, width / 2, barY - 50);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#ffffff20';
  ctx.lineWidth = 2;
  roundRect(ctx, barX, barY, barWidth, barHeight, 22);
  ctx.fill();
  ctx.stroke();

  if (progress > 0) {
    const xpGrad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    xpGrad.addColorStop(0, '#00FFAA');
    xpGrad.addColorStop(0.3, '#00DDFF');
    xpGrad.addColorStop(0.7, '#0088FF');
    xpGrad.addColorStop(1, '#0066CC');
    ctx.fillStyle = xpGrad;
    ctx.shadowColor = '#00FFAA';
    ctx.shadowBlur = 20;
    roundRect(ctx, barX, barY, Math.max(barWidth * progress, barHeight), barHeight, 22);
    ctx.fill();
    ctx.shadowBlur = 0;

    const shineGrad = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
    shineGrad.addColorStop(0.3, 'rgba(255,255,255,0.15)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shineGrad;
    roundRect(ctx, barX, barY, Math.max(barWidth * progress, barHeight), barHeight / 2, 22);
    ctx.fill();
  }

  const buffer = canvas.toBuffer('image/png');
  await sock.sendMessage(chatId, {
    image: buffer,
    caption: `🏆 *RANK CARD* 🏆\n👤 *${displayName}*\n⭐ *Level ${level}* | 🏅 *Rank ${userRank}/${totalUsers}*\n🔥 *${currentXP.toLocaleString()} XP* | 🎯 *${((progress * 100).toFixed(1))}% to next level*`,
  }, { quoted: msg });
}

async function generateTopCard(sock, msg, topUsers, groupName, topCount, chatId) {
  const width = 1200;
  const headerH = 140;
  const avatarSize = 48;
  const spacingY = 62;
  const padTop = headerH + 20;
  const padBottom = 40;
  const height = padTop + (topUsers.length * spacingY) + padBottom;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height));
  bgGradient.addColorStop(0, '#2a0860');
  bgGradient.addColorStop(0.5, '#1a0340');
  bgGradient.addColorStop(1, '#0d0120');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffffff10';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff20';
  ctx.strokeStyle = '#ffffff40';
  ctx.lineWidth = 3;
  roundRect(ctx, 20, 20, width - 40, height - 40, 30);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 44px "Poppins"';
  ctx.fillStyle = '#FFD700';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#FF8800';
  ctx.shadowBlur = 12;
  ctx.fillText(`🏆 TOP ${topCount} LEADERBOARD`, width / 2, 75);
  ctx.shadowBlur = 0;

  let displayGroupName = groupName.length > 30 ? groupName.substring(0, 27) + '...' : groupName;
  ctx.font = '600 28px "Poppins"';
  ctx.fillStyle = '#DDDDDD';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.fillText(displayGroupName, width / 2, 115);
  ctx.shadowBlur = 0;

  const paddingLeft = 110;

  for (let i = 0; i < topUsers.length; i++) {
    const user = topUsers[i];
    const yPos = padTop + i * spacingY;

    const avatarImg = await loadAvatar(sock, user.jid);

    ctx.save();
    ctx.beginPath();
    ctx.arc(paddingLeft + avatarSize / 2, yPos + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, paddingLeft, yPos, avatarSize, avatarSize);
    ctx.restore();

    ctx.font = 'bold 30px "Poppins"';
    ctx.fillStyle = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#AAAAAA';
    ctx.textAlign = 'right';
    ctx.fillText(`${i + 1}`, paddingLeft - 20, yPos + avatarSize / 2 + 10);

    let uName = user.name || user.jid.split('@')[0];
    if (uName.length > 18) uName = uName.substring(0, 15) + '...';
    ctx.font = 'bold 26px "Poppins"';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(uName, paddingLeft + avatarSize + 20, yPos + avatarSize / 2 + 9);
    ctx.shadowBlur = 0;

    const level = Math.floor(Math.sqrt(user.msgCount / 5));
    ctx.font = '22px "Poppins"';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00FFAA';
    ctx.fillText(`Lv.${level}`, width - 80, yPos + avatarSize / 2 - 4);
    ctx.fillStyle = '#bbbbbb';
    ctx.fillText(`${user.msgCount.toLocaleString()} msg`, width - 80, yPos + avatarSize / 2 + 22);
  }

  const buffer = canvas.toBuffer('image/png');
  await sock.sendMessage(chatId, {
    image: buffer,
    caption: `🏆 Top ${topCount} users in *${displayGroupName}*`,
  }, { quoted: msg });
}
