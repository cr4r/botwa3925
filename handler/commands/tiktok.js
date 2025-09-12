const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function resolveTiktokShortUrl(url) {
  try {
    // Disable auto follow-redirect!
    const res = await axios.get(url, { maxRedirects: 0 }).catch(e => e.response);
    // Cek header Location
    if (res && res.headers && res.headers.location) {
      return res.headers.location;
    }
    return url;
  } catch (err) {
    return url; // fallback
  }
}

/**
 * TikTok Downloader Command
 * @param {*} sock Baileys socket
 * @param {*} msg WhatsApp message
 * @param {*} param { from, ... }
 * param.url = url video (di-extract dari router)
 */
module.exports = async (sock, msg, { from, url }) => {
  if (!url || !url.includes('tiktok.com')) {
    await sock.sendMessage(from, { text: '❌ Link TikTok tidak valid bro!\n\nContoh: tiktok https://www.tiktok.com/@user/video/xxxxxx' }, { quoted: msg });
    return true;
  }

  // Auto resolve short url
  let tiktokUrl = url;
  if (tiktokUrl.includes('vt.tiktok.com')) {
    tiktokUrl = await resolveTiktokShortUrl(tiktokUrl);
    console.log(tiktokUrl, url)
    if (!tiktokUrl.includes('/video/')) {
      await sock.sendMessage(from, { text: '❌ Link TikTok tidak valid atau bukan link video bro!' }, { quoted: msg });
      return true;
    }
  }

  // --- LOGIC AMBIL VIDEO ---
  try {
    // 1. Fetch info dari API tikwm.com
    const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl);
    console.log(res.data)
    if (!res.data || res.data.code !== 0) {
      await sock.sendMessage(from, { text: '❌ Gagal fetch data TikTok (private/error/video dihapus). Cek link atau coba video lain.' }, { quoted: msg });
      return true;
    }

    const { play, title, author } = res.data.data;
    const vidUrl = play;
    console.log(`play ${play}, title: ${title}, author ${author}`)
    if (!vidUrl) throw new Error('URL video tidak ditemukan (private atau region lock)');

    // 2. Download video ke file sementara (./tmp/)
    const tmpDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const fileName = `tiktok_${Date.now()}.mp4`;
    const filePath = path.join(tmpDir, fileName);

    const videoStream = await axios.get(vidUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);
    videoStream.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 3. Kirim file ke user
    await sock.sendMessage(from, {
      video: fs.readFileSync(filePath),
      caption: `🎵 *TikTok Video*\n\n👤 ${author.nickname} (@${author.unique_id})\n📝 ${title || '-'}\n\n_No watermark, siap viral!_`
    }, { quoted: msg });

    // 4. Bersihkan file sementara
    fs.unlinkSync(filePath);

  } catch (err) {
    await sock.sendMessage(from, {
      text: `❌ Error download TikTok:\n${err.message || err}\n\nCoba video lain, atau cek API Tikwm.com.`
    }, { quoted: msg });
  }
  return true;
};
