const fs = require('fs');
const path = require('path');

const SLIP_DIR = path.join(__dirname, '../../slip_gaji');

module.exports = async (sock, msg, { from }) => {
  try {
    // KHUSUS CHAT PRIBADI!!!
    console.log(from)
    if (!from.endsWith('@s.whatsapp.net')) {
      return;
    }
    // Ambil text user
    const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").toLowerCase();

    // Cek ada kata 'slip gaji'
    if (!text.startsWith('slip gaji')) return;

    // Ambil query nama/NIK setelah "slip gaji"
    let query = text.replace('slip gaji', '').trim();
    if (!query) {
      await sock.sendMessage(from, { text: "Ketik: slip gaji <NIK/nama>" }, { quoted: msg });
      return;
    }

    // Scan semua file di folder slip_gaji
    const files = fs.readdirSync(SLIP_DIR).filter(f => f.endsWith('.pdf'));

    // Fuzzy match NIK/Nama (tidak case sensitive)
    // Cari file yang mengandung query di nama file
    const found = files.find(f => f.toLowerCase().includes(query));
    if (!found) {
      await sock.sendMessage(from, { text: `❌ Gagal, Slip gaji untuk "${query}" tidak ditemukan.` }, { quoted: msg });
      return;
    }
    captionMsg = `✅ *Slip Gaji Ditemukan!*

• *File:* ${found}

🔑 *Instruksi Membuka Slip Gaji:*
Gunakan password berupa *tanggal lahir* (format: DDMMYY, tanpa spasi atau garis miring).

*Contoh Password:*
- Jika tanggal lahir 6 September 1967 → 060967
- Jika tanggal lahir 12 Desember 2001 → 121201

_Butuh bantuan lebih lanjut? Balas chat ini!_`
    // Kirim file PDF ke user
    const filePath = path.join(SLIP_DIR, found);
    await sock.sendMessage(from, {
      document: fs.readFileSync(filePath),
      fileName: found,
      mimetype: 'application/pdf',
      caption: captionMsg
    }, { quoted: msg });

  } catch (e) {
    await sock.sendMessage(from, { text: "Gagal mengambil slip gaji: " + e.message }, { quoted: msg });
  }
};
