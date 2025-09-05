const chalk = require("chalk");

const jidToNumber = (jid) => {
  if (!jid) return "";
  // Kalau grup, return ID grup, kalau nomor pribadi, ambil nomor
  if (jid.endsWith("@s.whatsapp.net")) return jid.split("@")[0];
  if (jid.endsWith("@g.us")) return `[GROUP] ${jid.split("@")[0]}`;
  return jid;
};

function logChatProcess({ from, text, status }) {
  const chalk = require("chalk");
  const fromLabel = jidToNumber(from);
  const now = new Date().toLocaleTimeString("id-ID", { hour12: false, timeZone: "Asia/Jakarta" });
  const statusColor = status === "PROSES"
    ? chalk.yellow
    : status === "SELESAI"
      ? chalk.green
      : status === "ABAI"
        ? chalk.red
        : chalk.white;

  console.log(
    `[${chalk.cyan(now)}]` +
    ` [${chalk.magenta(fromLabel)}]` +
    ` | Pesan: "${chalk.white(text)}"` +
    ` | Status: ${statusColor(status)}`
  );
}


module.exports = { logChatProcess };
