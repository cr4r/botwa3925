const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(__dirname, "../../database/karyawan.json");
const { cek_staff_admin } = require("../../utils/cek_akses");

module.exports = async (sock, msg, { from, nama }) => {
  // Cek apakah sender termasuk admin
  let cek_akses = cek_staff_admin(msg);
  if (!cek_akses.status) {
    await sock.sendMessage(from, {
      text: cek_akses.message,
    }, { quoted: msg });
    return;
  }

  if (!nama) {
    await sock.sendMessage(from, { text: "Masukkan nama yang ingin dicari!\nContoh: data lbs tarmin" }, { quoted: msg });
    return;
  }

  if (!fs.existsSync(JSON_PATH)) {
    await sock.sendMessage(from, { text: "Database belum di-update! Silakan ketik: data lbs update" }, { quoted: msg });
    return;
  }
  const data = JSON.parse(fs.readFileSync(JSON_PATH));

  const results = data.filter(row =>
    (row["NAMA"] || "").toLowerCase().includes(nama.toLowerCase())
  );

  if (!results.length) {
    await sock.sendMessage(from, { text: `Data karyawan dengan nama "${nama}" tidak ditemukan.` }, { quoted: msg });
    return;
  }

  // Hanya tampilkan 5 data, biar tidak kepanjangan
  let pesan = `*📋 Data Karyawan "${nama}"*\n\n`;
  results.slice(0, 5).forEach((row, i) => {
    pesan +=
      `*#${i + 1}* — *${row["NAMA"]}*
━━━━━━━━━━━━━━━━━━━━
🏢 *Vendor*      : ${row["VENDOR"]}
🆔 *ID CARD*     : ${row["ID CARD"]}
💼 *Seksi/Dept*  : ${row["SEKSI/DEPT"]}
📋 *Job Desk*    : ${row["JOB DESK"]}
🗺️ *Lokasi*      : ${row["LOKASI DISTRIK"]}

👨‍👩‍👧‍👦 *Nomor KK* : ${row["NOMOR KK"]}
🆔 *NIK KTP*     : ${row["NIK KTP"]}
👶 *Tempat Lahir*: ${row["TEMPAT LAHIR"]}
📅 *Tgl Lahir*   : ${row["TANGGAL LAHIR"]}
👤 *Jenis Kelamin*: ${row["KELAMIN"]}
🕌 *Agama*       : ${row["AGAMA"]}
👨‍💼 *Status*     : ${row["STATUS"]}
🏠 *Alamat*      : ${row["ALAMAT"]}
🏙️ *Kota*        : ${row["KOTA"]}
📱 *No. HP*      : ${row["NO. HP"]}
👪 *Ibu Kandung* : ${row["IBU KANDUNG"]}
🏦 *Bank*        : ${row["BANK"]} (${row["NO. REKENING"]})

📅 *TMK*         : ${row["TMK"]}
📆 *Tanggal Resign*: ${row["TANGGAL RESIGN"] || "-"}

🏥 *BPJS KES*    : ${row["BPJS KES"]}
🏢 *BPJS TK*     : ${row["BPJS TK"]}
📄 *No. PKWT*    : ${row["NO. PKWT"]}
📅 *Tgl Berakhir*: ${row["TGL BERAKHIR PKWT"]}
📅 *Tgl Distribusi*: ${row["TGL DISTRIBUSI PKWT"]}

📝 *Keterangan*  : ${row["KETERANGAN DI BBI"] || "-"}
━━━━━━━━━━━━━━━━━━━━\n\n`;
  });
  if (results.length > 5) pesan += `dan ${results.length - 5} data lain ...`;

  await sock.sendMessage(from, { text: pesan.trim() }, { quoted: msg });
};