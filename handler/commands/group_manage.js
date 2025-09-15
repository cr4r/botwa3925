const { cek_akses_admin_grub } = require("../../utils/cek_akses");

module.exports = async (sock, msg, { from, text }) => {
  // 1. Cek hanya di grup
  if (!from.endsWith("@g.us")) {
    await sock.sendMessage(from, { text: "❌ Hanya bisa dijalankan di grup!" }, { quoted: msg });
    return;
  }

  // 2. Cek apakah pengirim adalah admin grup
  let cekAkses = await cek_akses_admin_grub(sock, msg, { from })
  if (!cekAkses.status) {
    await sock.sendMessage(from, { text: cekAkses.message }, { quoted: msg });
    return;
  }

  let target = text.split(" ").slice(1).join(" ");
  let action = text.split(" ")[0];

  // 3. Validasi nomor target
  if (!target || !/^\d{10,15}$/.test(target)) {
    await sock.sendMessage(from, { text: "Format: tambah/kick <nomor>\nContoh: tambah 628xxxxx", }, { quoted: msg });
    return;
  }

  let nomor = target.replace(/\D/g, ""); // ambil hanya angka
  if (nomor.startsWith("0")) nomor = "62" + nomor.slice(1);
  if (!nomor.startsWith("62")) nomor = "62" + nomor;
  const targetJid = `${nomor}@s.whatsapp.net`;
  console.log(targetJid)
  let addG = ["tambah", "add"]
  let kickG = ["kick", "keluarkan", "hapus", "remove"]

  if (addG.includes(action)) {
    try {
      const res = await sock.groupParticipantsUpdate(from, [targetJid], "add");
      // console.log("ADD RAW RES:", JSON.stringify(res, null, 2));
      if (res?.[0]?.status == 200) {
        await sock.sendMessage(from, { text: `✅ Berhasil menambahkan ${target}` }, { quoted: msg });
      } else {
        let alasan = {
          401: "Nomor tersebut *tidak terdaftar di WhatsApp* atau *sudah nonaktif* atau di blokir. Pastikan nomor WA target benar, aktif dan tidak di blokir.",
          403: "Bot bukan admin / nomor tidak bisa di-invite.",
          404: "Nomor belum pernah mendaftar WhatsApp.",
          408: "Nomor tidak ditemukan.",
        }[res?.[0]?.status] || "Gagal (cek format, admin, status WA target)";
        await sock.sendMessage(from, { text: `❌ Tidak bisa menambahkan:\n• Nomor: *${target}*\n• WA: *${targetJid}*\n• Alasan: ${alasan}` }, { quoted: msg });
      }
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Gagal menambahkan: ${e.message}` }, { quoted: msg });
      console.log("GROUP ADD ERROR:", e);
    }
  } else if (kickG.includes(action)) {
    try {
      await sock.groupParticipantsUpdate(from, [targetJid], "remove");
      await sock.sendMessage(from, { text: `✅ Berhasil mengeluarkan ${target}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(from, { text: `❌ Gagal mengeluarkan: ${e.message}` }, { quoted: msg });
    }
  }
};