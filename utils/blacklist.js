const fs = require("fs");
const BL_PATH = "./json/blacklist.json";

// Load blacklist dari file (biar persistent)
function loadBlacklist() {
  try {
    return JSON.parse(fs.readFileSync(BL_PATH));
  } catch (e) {
    return { numbers: [], groups: [] };
  }
}

// Simpan blacklist ke file
function saveBlacklist(data) {
  fs.writeFileSync(BL_PATH, JSON.stringify(data, null, 2));
}

function isBlacklisted(jid, type) {
  const { numbers, groups } = loadBlacklist();
  if (type === "group") return groups.includes(jid);
  return numbers.includes(jid.replace("@s.whatsapp.net", ""));
}

function addBlacklist(jid, type) {
  const bl = loadBlacklist();
  if (type === "group" && !bl.groups.includes(jid)) bl.groups.push(jid);
  if (type === "number") {
    let num = jid.replace("@s.whatsapp.net", "").replace("@g.us", "");
    if (!bl.numbers.includes(num)) bl.numbers.push(num);
  }
  saveBlacklist(bl);
}

module.exports = { isBlacklisted, addBlacklist, loadBlacklist };
