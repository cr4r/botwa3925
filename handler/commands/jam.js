module.exports = async (sock, msg, { from }) => {
  const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  await sock.sendMessage(from, { text: `Sekarang jam: ${now}` });
};
