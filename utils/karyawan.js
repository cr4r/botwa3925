const XLSX = require("xlsx");
const path = require("path");

const DB_PATH = path.join(__dirname, "../data/database_karyawan.xlsx");

function searchKaryawanByNama(nama, sheetName = "22 JULI-21 AGUSTUS 2025") {
  const wb = XLSX.readFile(DB_PATH);
  // Pastikan sheetName ada di workbook!
  if (!wb.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet "${sheetName}" tidak ditemukan di file database!`);
  }
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { range: 2 });

  // Search case-insensitive, bisa by nama lengkap/substring
  return data.filter(row =>
    (row["NAMA"] || "").toLowerCase().includes(nama.toLowerCase())
  );
}

// Bisa bikin fungsi search by ID CARD, NIK, dll juga
module.exports = { searchKaryawanByNama };
