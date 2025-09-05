module.exports = async (sock, msg, { from }) => {
  await sock.sendMessage(from, { text: "Halo juga! 👋" });
};
