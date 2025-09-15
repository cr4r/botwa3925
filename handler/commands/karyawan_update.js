const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const { excelDateToJSDate } = require("../../utils/date_excel")
const { cek_akses_staff_admin } = require("../../utils/cek_akses");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

const tempFile = path.join(__dirname, "../../temp/database_karyawan.xlsx");
const SHEET_NAME = "22 JULI-21 AGUSTUS 2025"; // Ubah sesuai sheet
const JSON_PATH = path.join(__dirname, "../../database/karyawan.json");

function mapHeaderRows(sheetArr, headerIdx = 2) {
  // sheetArr[headerIdx] = header array, sheetArr[headerIdx + 1] dst = data
  const header = sheetArr[headerIdx].map(x => (x || "").toString().trim());
  return sheetArr.slice(headerIdx + 1).map(row => {
    const obj = {};
    const tanggalVal = [6, 7, 8, 18]; // Index kolom tanggal (custom sesuai Excel kamu)
    const jenisKelaminVal = 15;
    const statusVal = 21;
    header.forEach((key, i) => {
      let isi = row[i];
      if (tanggalVal.includes(i) && isi) {
        isi = excelDateToJSDate(isi); // Helper date converter
      }
      if (jenisKelaminVal == i) {
        isi = isi == "L" ? "Laki Laki" : "Perempuan"
      }
      if (statusVal == i) {
        isi = isi == "K" ? "Kawin" : "Belum Kawin"
      }
      obj[key] = isi ?? ""; // Gunakan "" jika kosong
    });
    return obj;
  });

}

const updateDataLbs = (exelPath) => {
  let pesan = { status: true, message: 'ok' };
  let dataLength;
  try {
    // Baca file Excel dan ambil sheet yang diinginkan
    const wb = XLSX.readFile(exelPath);
    if (!wb.SheetNames.includes(SHEET_NAME)) {
      return pesan = { status: false, message: `Sheet "${SHEET_NAME}" tidak ditemukan!` }
    }

    const ws = wb.Sheets[SHEET_NAME];

    const sheetArr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });
    // Map ke array of object
    const data = mapHeaderRows(sheetArr);
    pesan.message = `✅ Database berhasil di-*update* dari Excel!\nTerdapat *${data.length}* data karyawan.`;
    // Simpan jadi file JSON
    fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    pesan = { status: false, message: `Gagal update database: ${e.message}` }
  }

  return pesan;
}

module.exports = async (sock, msg, { from }) => {
  // Ambil nomor sender
  let cek_akses = cek_akses_staff_admin(msg);
  if (!cek_akses.status) {
    await sock.sendMessage(from, {
      text: cek_akses.message,
    }, { quoted: msg });
    return;
  }

  // Mengambil dokumen yang di tag
  const quotedMsg = msg.message?.extendedTextMessage?.contextInfo.quotedMessage;
  const quotedDoc = quotedMsg?.documentWithCaptionMessage;
  if (quotedDoc) {
    console.log(2)
    // Download file dari pesan yang di-tag
    const buffer = await downloadMediaMessage(
      { message: { documentWithCaptionMessage: quotedDoc } },
      "buffer",
      {},
      { reuploadRequest: sock.ev }
    );

    fs.writeFileSync(tempFile, buffer);
  }

  // Cek jika pesan berupa dokumen dan ada caption "data lbs update"
  if (msg.message?.documentWithCaptionMessage?.message?.documentMessage?.caption) {
    let dokumenFile = msg.message?.documentWithCaptionMessage?.message?.documentMessage
    const caption = dokumenFile?.caption.toLowerCase() || "";
    const isExcel = (dokumenFile?.mimetype || "").includes("spreadsheet") ||
      (dokumenFile?.fileName || "").endsWith(".xlsx");

    if (caption.includes("data lbs update") && isExcel) {
      // Download dokumen Excel
      const buffer = await downloadMediaMessage(msg, "buffer", {}, { reuploadRequest: sock.ev });

      // Simpan file temporer
      fs.writeFileSync(tempFile, buffer);
    }
  };

  let hasilUpdate = updateDataLbs(tempFile);
  await sock.sendMessage(from, { text: hasilUpdate.message }, { quoted: msg });
  return;
};
