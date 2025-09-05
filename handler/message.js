const { logChatProcess } = require("../utils/logger");
const commandList = require("../json/commands.json");
const { isBlacklisted } = require("../utils/blacklist");
const stringSimilarity = require('string-similarity');
const fs = require("fs");
const path = require("path");
const { renderTemplate } = require("../utils/commands");


function getMsgType(msg) {
  if (msg.message?.conversation) return "text";
  if (msg.message?.imageMessage) return "image";
  if (msg.message?.audioMessage) return "audio";
  if (msg.message?.videoMessage) return "video";
  if (msg.message?.stickerMessage) return "sticker";
  if (msg.message?.documentMessage) return "document";
  if (msg.message?.extendedTextMessage) return "tag";
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
  let chatType = getMsgType(msg).toLowerCase();
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

    // Blacklist command tetap manual
    if (text.startsWith("!blacklist")) {
      const commandArg = text.split(" ")[1] || from.replace("@s.whatsapp.net", "");
      await commands.blacklist(sock, msg, { from, isGroup, commandArg });
      logChatProcess({ from, text: "[BLACKLIST ADDED]", status: "SELESAI" });
      return;
    }

    // ===== Hybrid Array Fuzzy Matching =====
    // Gabungkan semua trigger jadi satu array triggerItems
    const triggerItems = [];
    commandList.forEach(cmd => {
      if (Array.isArray(cmd.trigger)) {
        cmd.trigger.forEach(tr => triggerItems.push({ trigger: tr.toLowerCase(), cmd }));
      } else {
        triggerItems.push({ trigger: cmd.trigger.toLowerCase(), cmd });
      }
    });

    // Cek best match untuk semua trigger
    const triggersOnly = triggerItems.map(x => x.trigger);
    const { bestMatch } = stringSimilarity.findBestMatch(text, triggersOnly);

    if (bestMatch.rating > 0.65) {
      const found = triggerItems.find(x => x.trigger === bestMatch.target).cmd;
      // Ganti semua template sekalian
      let replyArray = Array.isArray(found.response) ? found.response[Math.floor(Math.random() * found.response.length)] : found.response;
      let reply = renderTemplate(replyArray, { sapaan: bestMatch.target });

      await sock.sendMessage(from, { text: reply });
      logChatProcess({ from, text: `[REPLY ${bestMatch.target.toUpperCase()}]`, status: "SELESAI" });
      return;
    }
  }


  // --- Jika bukan teks, info jenis pesan
  if (chatType == "tag" || chatType == "image" || chatType == "video") {
    const text =
      (msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        "").trim().toLowerCase();

    if (text.startsWith("!stiker")) {
      // Cek reply gambar
      let proses = await commands.stiker(sock, msg, { from });
      return logChatProcess({ from, text: `[TAG ${text}]`, status: proses });
    }

    // logChatProcess({ from, text: "[TAG", status: "SELESAI" });
  }

  logChatProcess({ from, text: chatText, status: "SELESAI" });
}

module.exports = { handleMessage };
