const fs = require('fs');
const path = require('path');

const SLIP_DIR = path.join(__dirname, '../../slip_gaji');

module.exports = async (sock, msg, { from }) => {
  try {
    // Ambil text user
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").toLowerCase();

    // Cek ada kata 'slip gaji'
    if (!text.startsWith('slip gaji')) return;

    // Ambil query nama/NIK setelah "slip gaji"
    let query = text.replace('slip gaji', '').trim();
    if (!query) {
      await sock.sendMessage(from, { text: "Ketik: slip gaji <NIK/nama>" });
      return;
    }

    // Scan semua file di folder slip_gaji
    const files = fs.readdirSync(SLIP_DIR).filter(f => f.endsWith('.pdf'));

    // Fuzzy match NIK/Nama (tidak case sensitive)
    // Cari file yang mengandung query di nama file
    const found = files.find(f => f.toLowerCase().includes(query));
    if (!found) {
      await sock.sendMessage(from, { text: `Slip gaji untuk "${query}" tidak ditemukan.` });
      return;
    }

    // Kirim file PDF ke user
    const filePath = path.join(SLIP_DIR, found);
    await sock.sendMessage(from, {
      document: fs.readFileSync(filePath),
      fileName: found,
      mimetype: 'application/pdf'
    });

    await sock.sendMessage(from, { text: `Slip gaji ditemukan: ${found}` }, { quoted: msg });

  } catch (e) {
    await sock.sendMessage(from, { text: "Gagal mengambil slip gaji: " + e.message });
  }
};
