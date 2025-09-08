const { logChatProcess } = require("../utils/logger");
const { isBlacklisted } = require("../utils/blacklist");
const { parseCommand } = require("./router");

function getMsgType(msg) { if (msg.message?.conversation) return "text"; if (msg.message?.imageMessage) return "image"; if (msg.message?.audioMessage) return "audio"; if (msg.message?.videoMessage) return "video"; if (msg.message?.stickerMessage) return "sticker"; if (msg.message?.documentMessage) return "document"; if (msg.message?.extendedTextMessage) return "tag"; return Object.keys(msg.message)[0] || "unknown"; }

async function handleMessage(sock, msg) {
  const from = msg.key.remoteJid;
  const isGroup = from.endsWith("@g.us");
  let chatType = getMsgType(msg);
  let chatText = chatType === "text" ? msg.message.conversation : `[${chatType.toUpperCase()} MESSAGE]`;

  // Blacklist check
  if (isBlacklisted(from, isGroup ? "group" : "number")) {
    logChatProcess({ from, text: "[BLACKLISTED]", status: "Diabaikan" });
    return;
  }
  logChatProcess({ from, text: chatText, status: "PROSES" });

  // === ROUTE ALL COMMAND / MESSAGE ===
  const handled = await parseCommand(sock, msg, { from, chatType });
  if (handled) {
    logChatProcess({ from, text: `[ROUTED/${chatType}]`, status: "SELESAI" });
    return;
  }

  logChatProcess({ from, text: chatText, status: "SELESAI" });
}
module.exports = { handleMessage };

// --- getMsgType dipisah ke utils/helper.js ---
