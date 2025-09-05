const { addBlacklist } = require("../../utils/blacklist");
module.exports = async (sock, msg, { from, isGroup, commandArg }) => {
  if (!isGroup && commandArg) {
    addBlacklist(commandArg, "number");
    await sock.sendMessage(from, { text: `Nomor ${commandArg} berhasil masuk blacklist! 🛑` });
  } else if (isGroup) {
    addBlacklist(from, "group");
    await sock.sendMessage(from, { text: `Grup ini (${from}) berhasil masuk blacklist! 🚫` });
  }
};
