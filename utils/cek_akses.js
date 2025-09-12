const { staff_bbi, super_admin } = require("../json/whitelist.json");

const cek_staff_admin = (msg) => {
  let pesan = { status: true, message: "ok" }

  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNumber = senderJid.replace(/[@:].*$/, "");

  if (!staff_bbi.includes(senderNumber) || !super_admin.includes(senderNumber)) {
    pesan = { status: false, message: `❌ *Akses ditolak!*\nPerintah ini hanya bisa digunakan oleh Staff BBI.` }
  }

  return pesan;
}


module.exports = { cek_staff_admin }