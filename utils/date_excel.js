function excelDateToJSDate(serial) {
    if (!serial || isNaN(serial)) return serial;
    const excelEpoch = new Date(1899, 11, 30);
    const days = Math.floor(serial);
    const result = new Date(excelEpoch.getTime() + days * 86400000);
    const dd = String(result.getDate()).padStart(2, "0");
    const mm = String(result.getMonth() + 1).padStart(2, "0");
    const yyyy = result.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}
module.exports = { excelDateToJSDate };
