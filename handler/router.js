const fs = require('fs');
const path = require('path');
const { fuzzyMatch } = require('./fuzzy');

const commands = {}; // Auto loader, sama seperti sebelumnya
fs.readdirSync(path.join(__dirname, "commands")).forEach(file => {
  const cmdName = file.replace(".js", "");
  commands[cmdName] = require(`./commands/${file}`);
});

const commandList = require("../json/commands.json");
const actionCommandList = require("../json/action_commands.json");
const stringSimilarity = require('string-similarity');
const { renderTemplate } = require("../utils/commands");

// Routing logic here
async function parseCommand(sock, msg, { from, chatType }) {
  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.documentWithCaptionMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentWithCaptionMessage?.message?.documentMessage?.caption ||
    ""
  ).trim().toLowerCase();

  // ==== Modular Action Commands ====
  for (let [cmd, aliases] of Object.entries(actionCommandList)) {
    // Cek apakah text diawali salah satu alias (case-insensitive)
    if (aliases.some(alias => text.startsWith(alias))) {
      let extraParams = {};
      extraParams.text = text;

      // khusus Youtube
      if (cmd == "youtube") {
        // Khusus ytvideo: ambil url & info
        let parts = text.split(" ");
        extraParams.url = parts[1] || (
          msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation?.trim()
        );
        extraParams.info = parts[2] === "info" || false;
      }

      await commands[cmd](sock, msg, { from, ...extraParams }); // Panggil function di /commands/
      return true;
    }
  }
  // --- COMMAND JSON (fuzzy match) ---
  const triggerItems = [];
  commandList.forEach(cmd => {
    if (Array.isArray(cmd.trigger)) {
      cmd.trigger.forEach(tr => triggerItems.push({ trigger: tr.toLowerCase(), cmd }));
    } else {
      triggerItems.push({ trigger: cmd.trigger.toLowerCase(), cmd });
    }
  });

  const fuzzyResult = fuzzyMatch(text, triggerItems, 0.65);
  if (fuzzyResult && fuzzyResult.matchedCommand) {
    let replyArray = Array.isArray(fuzzyResult.matchedCommand.response)
      ? fuzzyResult.matchedCommand.response[Math.floor(Math.random() * fuzzyResult.matchedCommand.response.length)]
      : fuzzyResult.matchedCommand.response;

    let reply = renderTemplate(replyArray, { sapaan: fuzzyResult.bestMatch.target });
    await sock.sendMessage(from, { text: reply }, { quoted: msg });
    return true;
  }

  // --- STIKER Handler (image/video/tag) ---
  if (chatType == "tag" || chatType == "image" || chatType == "video") {
    if (text.startsWith("!stiker")) {
      await commands.stiker(sock, msg, { from });
      return true;
    }
  }

  return false;
}
module.exports = { parseCommand };
