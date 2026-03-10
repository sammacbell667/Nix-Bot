const { createCanvas, registerFont } = require('canvas');
const path = require('path');

const FONTS_DIR = path.join(__dirname, 'assets', 'fonts');
let fontsRegistered = false;

function regFonts() {
  if (fontsRegistered) return;
  try {
    registerFont(path.join(FONTS_DIR, 'Bold.ttf'), { family: 'Poppins', weight: 'bold' });
    registerFont(path.join(FONTS_DIR, 'Regular.ttf'), { family: 'Poppins' });
    fontsRegistered = true;
  } catch (e) {}
}

const pastelColors = [
  '#FFD6E8', '#D6EFFF', '#FFF5BA', '#D7FFD6',
  '#FAD9FF', '#FFE4C4', '#E6E6FA', '#FFDEAD',
  '#BFFCC6', '#C9C9FF'
];

module.exports = {
  config: {
    name: 'stats',
    prefix: true,
    role: 0,
    category: 'utility',
    aliases: ['topcommands'],
    author: 'ArYAN',
    version: '1.0.0',
    countDown: 10,
    description: { en: 'See the most used commands' },
    guide: { en: '{pn}' },
  },

  async onStart({ sock, api, chatId, event, message, usersData, reply }) {
    regFonts();

    const msg = event || message;

    try {
      const commandLogs = Object.assign({}, global.NixBot?.commandLogs || {});

      if (Object.keys(commandLogs).length === 0) {
        return reply('📊 No command usage data available yet. Use some commands first!');
      }

      const top = Object.entries(commandLogs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const commandUsage = Object.fromEntries(top);

      const width = 1000;
      const height = 700;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#fffafc';
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 800; i++) {
        ctx.fillStyle = `rgba(255,182,193,${Math.random() * 0.05})`;
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff69b4';
      ctx.font = 'bold 48px "Poppins"';
      ctx.shadowColor = '#fdaec5';
      ctx.shadowBlur = 15;
      ctx.fillText('Command Usage Stats', width / 2, 80);
      ctx.shadowBlur = 0;

      ctx.font = '24px Poppins';
      ctx.fillStyle = '#c71585';
      ctx.fillText('Which commands are the most popular?', width / 2, 120);

      const values = Object.values(commandUsage);
      const total = values.reduce((a, b) => a + b, 0);

      const centerX = width / 2;
      const centerY = 420;
      const radius = 250;

      let startAngle = -Math.PI / 2;

      Object.entries(commandUsage).forEach(([cmd, count], i) => {
        const sliceAngle = (count / total) * (Math.PI * 2);
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius);
        gradient.addColorStop(0, pastelColors[i % pastelColors.length]);
        gradient.addColorStop(1, '#ffffff');

        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffb6c1';
        ctx.stroke();

        const midAngle = startAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(midAngle) * (radius + 40);
        const labelY = centerY + Math.sin(midAngle) * (radius + 40);

        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(midAngle) * radius, centerY + Math.sin(midAngle) * radius);
        ctx.lineTo(labelX, labelY);
        ctx.strokeStyle = '#f49ac2';
        ctx.lineWidth = 2;
        ctx.stroke();

        const percent = ((count / total) * 100).toFixed(1) + '%';

        ctx.fillStyle = '#7d3f59';
        ctx.font = 'bold 20px "Poppins"';
        ctx.textAlign = midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2 ? 'right' : 'left';
        ctx.textBaseline = 'middle';

        ctx.fillText(`${cmd} (${percent})`, labelX, labelY);

        startAngle = endAngle;
      });

      ctx.lineWidth = 10;
      ctx.strokeStyle = '#f8c1d7';
      ctx.shadowColor = '#ffb6c1';
      ctx.shadowBlur = 25;
      ctx.strokeRect(8, 8, width - 16, height - 16);

      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f49ac2';
      ctx.strokeRect(25, 25, width - 50, height - 50);

      const buffer = canvas.toBuffer('image/png');

      let caption = `📊 *Top Commands Usage* 📅\n\n`;
      top.forEach(([name, count], i) => {
        caption += `${i + 1}. \`${name}\` — *${count} uses*\n`;
      });

      await (sock || api).sendMessage(chatId, {
        image: buffer,
        caption: caption.trim(),
      }, { quoted: msg });

    } catch (e) {
      console.error('[STATS] Error:', e);
      return reply('❌ Error generating stats: ' + e.message);
    }
  },
};
