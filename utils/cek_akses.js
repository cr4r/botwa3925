const { staff_bbi, super_admin } = require("../json/whitelist.json");

const cek_akses_staff_admin = (msg) => {
  let pesan = { status: false, message: "❌ *Akses ditolak!*\nPerintah ini hanya bisa digunakan oleh Staff BBI." }

  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNumber = senderJid.replace(/[@:].*$/, "");
  console.log(senderNumber, staff_bbi, !staff_bbi.includes(senderNumber), !super_admin.includes(senderNumber));
  if (staff_bbi.includes(senderNumber) || super_admin.includes(senderNumber)) {
    pesan = { status: true, message: `OK` }
  }

  return pesan;
}

/**
 * Dapatkan semua admin & owner grup dari sock (wa connection) dan jid grup.
 * Bisa dipakai di command: module.exports = async (sock, msg, { from, nama }) => {...}
 * 
 * @param {object} sock - wa socket
 * @param {object} msg  - message object
 * @param {object} param - { from }
 * @returns {object} { adminList, owner }
 */
const cek_admin_grub = async (sock, msg, { from }) => {
  if (!from.endsWith("@g.us")) return { adminList: [], owner: null };

  const meta = await sock.groupMetadata(from);
  const adminList = meta.participants.filter(x => x.admin === "admin" || x.admin === "superadmin");
  const owner = meta.participants.find(x => x.admin === "superadmin");

  // Kamu bisa return objek, array nomor, atau format bebas sesuai kebutuhan
  return { adminList, owner };
};

const cek_akses_admin_grub = async (sock, msg, { from }) => {
  let pesan = { status: false, message: "❌ Perintah ini hanya bisa digunakan di grup!" }
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const senderNumber = senderJid.replace(/[@:].*$/, "");

  if (!from.endsWith("@g.us")) return pesan;

  // 2. Cek apakah sender admin grup
  const { adminList } = await cek_admin_grub(sock, msg, { from });
  const isAdmin = adminList.some(x => x.id.includes(senderNumber));
  if (!isAdmin) {
    pesan.message = "❌ *Khusus admin grup!*"
    return pesan;
  }

  return { status: true, message: "OK" }
}

module.exports = { cek_akses_staff_admin, cek_admin_grub, cek_akses_admin_grub }