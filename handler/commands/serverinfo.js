const osu = require("os-utils");
const os = require("os");
const fs = require("fs");
const { execSync } = require("child_process");

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024, dm = 2, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function formatUptimeDays(seconds) {
  const days = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  let result = "";
  if (days > 0) result += `${days} hari `;
  if (h > 0) result += `${h} jam `;
  if (m > 0) result += `${m} menit `;
  result += `${s} detik`;
  return result.trim();
}

module.exports = async (sock, msg, { from }) => {
  osu.cpuUsage(function (cpuPercent) {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

    // Proses
    const uptime = formatUptimeDays(os.uptime());
    const platform = os.platform();
    const arch = os.arch();
    const cpuCores = os.cpus().length;
    const processCount = os.cpus().length; // Asumsi 1 proses per core (atau bisa pakai ps -e | wc -l)
    let psCount = "-";
    try {
      psCount = execSync('ps -e --no-headers | wc -l').toString().trim();
    } catch { }

    // Load average
    const loadAvg = os.loadavg();
    const loadAvgStr = loadAvg.map(x => x.toFixed(2)).join(" / ");
    const loadAvgExplain = `(1m / 5m / 15m | ideal <${cpuCores}.00)`;

    // Disk usage
    let diskInfo = "❓";
    let diskFree = "❓";
    let diskUsed = "❓";
    let diskTotal = "❓";
    let diskPercent = "❓";
    try {
      // Hanya root partition (Linux)
      const df = execSync("df -h --output=used,avail,size,pcent / | tail -n1").toString().trim().split(/\s+/);
      diskUsed = df[0];
      diskFree = df[1];
      diskTotal = df[2];
      diskPercent = df[3];
      diskInfo = `${diskUsed} digunakan, ${diskFree} bebas dari total ${diskTotal} (${diskPercent})`;
    } catch (e) { diskInfo = "Gagal deteksi disk"; }

    // Kata-kata dinamis sesuai kondisi
    let quote = "";
    if (cpuPercent * 100 > 80 || memPercent > 85 || diskPercent.replace('%', '') > 85) {
      quote = "⚠️ Server udah ngos-ngosan bro... Ada yang main mining di sini? 😱";
    } else if (cpuPercent * 100 > 60 || memPercent > 70 || diskPercent.replace('%', '') > 70) {
      quote = "🚦 Server mulai kerja keras, tapi masih aman lah! Jangan di-spam ya 😅";
    } else {
      quote = "Tenang, server ini belum lelah. Belum ada yang minta cuti. 😎";
    }

    // Format balasan
    const reply = `
🌐 *Server Status Monitor*
────────────────────────
• 🖥️ OS        : *${platform}* (${arch})
• 🔥 CPU       : *${cpuCores} core*
• ⚡ CPU Load  : *${(cpuPercent * 100).toFixed(1)}%*  (_${psCount} proses aktif_)
• 📈 LoadAvg   : *${loadAvgStr}*  ${loadAvgExplain}
• 🧠 RAM       : *${formatBytes(usedMem)}* dipakai dari *${formatBytes(totalMem)}*  (${memPercent}%)
• 💽 Disk      : *${diskInfo}*
• 🕒 Uptime    : *${uptime}*

_${quote}_
`.trim();

    sock.sendMessage(from, { text: reply }, { quoted: msg });
  });
};
