const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const { handleMessage } = require("./handler/message");

const PQueue = require('p-queue').default;
const queue = new PQueue({ concurrency: 1 });

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log("Scan QR untuk login WhatsApp bot-mu!");
    }
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log("Logged out, scan ulang ya!");
        startBot();
      } else {
        console.log("Koneksi terputus, reconnect...");
        startBot();
      }
    } else if (connection === "open") {
      console.log("Bot sudah online! 🚀");
    }
  });

  sock.ev.on("messages.upsert", async (m, type) => {
    // if (type !== "notify") return;
    const msg = m.messages[0];
    if (!msg.message || !msg.key.remoteJid) return;

    queue.add(async () => {
      try {
        await handleMessage(sock, m.messages[0]); // handler kamu
      } catch (err) {
        console.error("Error handling message:", err);
      }
    });
  });

  // Tambahkan logging antrian queue
  queue.on('add', () => console.log(`Queue length: ${queue.size}`));
}

startBot();
