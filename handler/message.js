const { logChatProcess } = require("../utils/logger");
const commandList = require("../json/commands.json");
const { isBlacklisted } = require("../utils/blacklist");
const stringSimilarity = require('string-similarity');
const fs = require("fs");
const path = require("path");

function getMsgType(msg) {
  if (msg.message?.conversation) return "text";
  if (msg.message?.imageMessage) return "image";
  if (msg.message?.audioMessage) return "audio";
  if (msg.message?.videoMessage) return "video";
  if (msg.message?.stickerMessage) return "sticker";
  if (msg.message?.documentMessage) return "document";
  return Object.keys(msg.message)[0] || "unknown";
}

// Loader: scan semua command di handler/commands
const commands = {};
fs.readdirSync(path.join(__dirname, "commands")).forEach(file => {
  const cmdName = file.replace(".js", "");
  commands[cmdName] = require(`./commands/${file}`);
});

async function handleMessage(sock, msg) {
  const from = msg.key.remoteJid;
  const isGroup = from.endsWith("@g.us");
  let chatType = getMsgType(msg);
  let chatText = chatType === "text" ? msg.message.conversation : `[${chatType.toUpperCase()} MESSAGE]`;

  // Cek blacklist
  if (isBlacklisted(from, isGroup ? "group" : "number")) {
    logChatProcess({ from, text: "[BLACKLISTED]", status: "Diabaikan" });
    return;
  }

  logChatProcess({ from, text: chatText, status: "PROSES" });

  // --- Command router (text only)
  if (chatType === "text") {
    const text = msg.message.conversation.trim().toLowerCase();

    // Blacklist manual
    if (text.startsWith("!blacklist")) {
      const commandArg = text.split(" ")[1] || from.replace("@s.whatsapp.net", "");
      await commands.blacklist(sock, msg, { from, isGroup, commandArg });
      logChatProcess({ from, text: "[BLACKLIST ADDED]", status: "SELESAI" });
      return;
    }

    // --- Fuzzy matching dari string-similarity
    const triggers = commandList.map(cmd => cmd.trigger.toLowerCase());
    const { bestMatch } = stringSimilarity.findBestMatch(text, triggers);

    if (bestMatch.rating > 0.65) {
      const found = commandList.find(cmd => cmd.trigger.toLowerCase() === bestMatch.target);
      let reply = found.response;
      if (reply.includes("{{time}}")) {
        reply = reply.replace("{{time}}", new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }));
      }
      await sock.sendMessage(from, { text: reply });
      logChatProcess({ from, text: `[REPLY ${found.trigger.toUpperCase()}]`, status: "SELESAI" });
      return;
    }
  }

  // --- Jika bukan teks, info jenis pesan
  if (chatType !== "text") {
    // await sock.sendMessage(from, { text: `Kamu kirim pesan jenis: ${chatType}` });
  }

  logChatProcess({ from, text: chatText, status: "SELESAI" });
}

module.exports = { handleMessage };
