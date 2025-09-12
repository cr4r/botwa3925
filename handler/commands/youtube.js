const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const COOKIES_PATH = path.join(__dirname, "../../utils/cookies.txt");
// Helper untuk ambil format terbaik sesuai preferensi
function getBestFormat(formats) {
  // Prioritas: 720p mp4, lalu 480p mp4, lalu tertinggi <720p
  let best = null;
  const sorted = formats
    .filter(f => f.ext === 'mp4' && f.vcodec !== 'none')
    .sort((a, b) => (b.height || 0) - (a.height || 0));

  best = sorted.find(f => f.height === 720) ||
    sorted.find(f => f.height === 480) ||
    sorted.find(f => (f.height || 0) < 720);

  if (!best && sorted.length > 0) best = sorted[0]; // fallback ke tertinggi mp4

  return best;
}

// Format bytes
function formatBytes(bytes) {
  if (!bytes) return "??";
  const k = 1024, dm = 1, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function execAsync(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { ...options }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve(stdout);
    });
  });
}

module.exports = async (sock, msg, { from, url, info }) => {
  try {
    if (!url || !/^https?:\/\/\S+/.test(url)) {
      await sock.sendMessage(from, { text: "Format: `ytvideo <url> [info]`\nContoh:\n- ytvideo https://youtube.com/xxxx\n- ytvideo https://youtube.com/xxxx info" }, { quoted: msg });
      return;
    }

    // --- Show info only ---
    if (info) {
      try {
        const cmd = `yt-dlp --cookies "${COOKIES_PATH}" -J --no-playlist "${url}"`;
        const stdout = await execAsync(cmd, { maxBuffer: 30 * 1024 * 1024 });
        const data = JSON.parse(stdout);
        const videoTitle = data.title || "Tanpa judul";
        let text = `*${videoTitle}*\n\n*Resolusi/Format Tersedia:*\n`;

        const formats = data.formats
          .filter(f => f.ext === "mp4" && f.vcodec !== "none")
          .sort((a, b) => (b.height || 0) - (a.height || 0));

        if (!formats.length) text += "_Tidak ada format mp4 yang bisa didownload._";
        else formats.forEach(f => {
          text += `• ${f.format_id} — ${f.height || "?"}p — ${formatBytes(f.filesize || f.filesize_approx)}\n`;
        });

        text += `\nKetik: *ytvideo <url>* untuk download otomatis kualitas terbaik di bawah 720p.`;
        await sock.sendMessage(from, { text }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(from, { text: "Gagal ambil info video.\n" + (e.stderr || e.message || e) }, { quoted: msg });
      }
      // exec(cmd, { maxBuffer: 30 * 1024 * 1024 }, (err, stdout, stderr) => {
      //   if (err) {
      //     console.log(err)
      //     sock.sendMessage(from, { text: "Gagal ambil info video.\n" + (stderr || err.message) }, { quoted: msg });
      //     return;
      //   }
      //   try {
      //     const data = JSON.parse(stdout);
      //     const videoTitle = data.title || "Tanpa judul";
      //     let text = `*${videoTitle}*\n\n*Resolusi/Format Tersedia:*\n`;

      //     const formats = data.formats
      //       .filter(f => f.ext === "mp4" && f.vcodec !== 'none')
      //       .sort((a, b) => (b.height || 0) - (a.height || 0));

      //     if (!formats.length) text += "_Tidak ada format mp4 yang bisa didownload._";
      //     else formats.forEach(f => {
      //       text += `• ${f.format_id} — ${f.height || "?"}p — ${formatBytes(f.filesize || f.filesize_approx)}\n`;
      //     });

      //     text += `\nKetik: *ytvideo <url>* untuk download otomatis kualitas terbaik di bawah 720p.`;
      //     sock.sendMessage(from, { text }, { quoted: msg });
      //   } catch (e) {
      //     sock.sendMessage(from, { text: "Error parsing info video: " + e.message }, { quoted: msg });
      //   }
      // });
      return;
    }

    // --- Download best format ---
    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Dapatkan info format JSON dulu
    const infoCmd = `yt-dlp --cookies "${COOKIES_PATH}" -J --no-playlist "${url}"`;
    const infoData = await new Promise((resolve, reject) => {
      exec(infoCmd, { maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) return reject(stderr || err.message);
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject("Gagal parsing info video: " + e.message);
        }
      });
    });

    const formats = infoData.formats.filter(f => f.ext === "mp4" && f.vcodec !== 'none');
    const bestFormat = getBestFormat(formats);

    if (!bestFormat) {
      await sock.sendMessage(from, { text: "Tidak ada format mp4 yang bisa didownload dari video ini!" }, { quoted: msg });
      return;
    }

    // Cek size <64MB
    const maxSize = 64 * 1024 * 1024;
    const size = bestFormat.filesize || bestFormat.filesize_approx || 0;
    if (size > maxSize) {
      await sock.sendMessage(from, { text: `Ukuran video (${formatBytes(size)}) lebih dari 64MB! Pilih resolusi lebih kecil lewat *ytvideo <url> info*` }, { quoted: msg });
      return;
    }

    // Download video dengan format_id yang ditemukan
    const fileName = `ytvideo_${Date.now()}_${bestFormat.format_id}.mp4`;
    const filePath = path.join(tempDir, fileName);
    const downloadCmd = `yt-dlp --cookies "${COOKIES_PATH}" -f "${bestFormat.format_id}" -o "${filePath}" "${url}" --no-playlist`;

    await new Promise((resolve, reject) => {
      exec(downloadCmd, { timeout: 180000 }, (err, stdout, stderr) => {
        if (err) return reject(stderr || err);
        resolve(stdout);
      });
    });

    if (!fs.existsSync(filePath)) {
      await sock.sendMessage(from, { text: "Gagal download video (file tidak ditemukan)." }, { quoted: msg });
      return;
    }

    await sock.sendMessage(from, {
      video: fs.readFileSync(filePath),
      mimetype: "video/mp4",
      fileName: fileName,
      caption: `Berhasil! Video resolusi ${bestFormat.height}p — ${formatBytes(size)}`
    }, { quoted: msg });

    fs.unlinkSync(filePath);
  } catch (e) {
    await sock.sendMessage(from, { text: `Gagal download: ${e.message || e}` }, { quoted: msg });
  }
};
