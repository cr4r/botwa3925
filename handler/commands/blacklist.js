const { addBlacklist } = require("../../utils/blacklist");


module.exports = async (sock, msg, { from, isGroup, commandArg }) => {
  let target = null;
  let type = null;
  let replyMsg = "";

  // Cek jika ada argumen dan argumen seperti nomor WA
  if (commandArg && /^\d{10,20}$/.test(commandArg.replace(/\D/g, ""))) {
    target = commandArg.replace(/\D/g, "") + "@s.whatsapp.net";
    type = "number";
    addBlacklist(target, type);
    replyMsg = `Nomor *${commandArg}* berhasil masuk blacklist! 🛑`;
  }
  // Kalau di grup, tanpa argumen → blacklist grup
  else if (isGroup) {
    target = from; // JID grup
    type = "group";
    addBlacklist(target, type);
    replyMsg = `Grup ini (${from}) berhasil masuk blacklist! 🚫`;
  }
  // Kalau chat pribadi, tanpa argumen → blacklist user yang chat
  else {
    target = from;
    type = "number";
    addBlacklist(target, type);
    replyMsg = `Nomor ini (${from.replace("@s.whatsapp.net", "")}) berhasil masuk blacklist! 🛑`;
  }

  await sock.sendMessage(from, { text: replyMsg }, { quoted: msg });
};
