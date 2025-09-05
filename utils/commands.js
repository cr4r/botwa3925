function renderTemplate(str, options = {}) {
  // Waktu sekarang Jakarta
  if (str.includes("{{time}}")) {
    str = str.replace("{{time}}", new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }));
  }
  // Sapaan dinamis (jika ada)
  if (str.includes("{{sapaan}}")) {
    str = str.replace("{{sapaan}}", options.sapaan || "");
  }
  // Bisa tambah variabel lain di sini
  // if (str.includes("{{namamu}}")) { ... }
  return str;
}

module.exports = { renderTemplate };
