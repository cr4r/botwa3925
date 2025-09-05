const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const fs = require("fs");
const path = require("path");

async function videoToAnimatedWebp(buffer) {
  const inputFile = path.join(__dirname, "../../temp/input-" + Date.now() + ".mp4");
  const outputFile = path.join(__dirname, "../../temp/output-" + Date.now() + ".webp");
  fs.writeFileSync(inputFile, buffer);
  return new Promise((resolve, reject) => {
    let durasiVideo = 10
    ffmpeg(inputFile)
      .inputOptions(["-t", durasiVideo])
      .outputOptions([
        "-t", durasiVideo,
        "-vcodec", "libwebp",
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=10',
        "-loop", "0",
        "-preset", "default",
        "-an", "-vsync", "0",
        "-lossless", "1",
        "-quality", "75",
        "-pix_fmt", "yuva420p"
      ])
      .duration(durasiVideo)
      .save(outputFile)
      .on("end", () => {
        const webpBuffer = fs.readFileSync(outputFile);
        fs.unlinkSync(inputFile);
        fs.unlinkSync(outputFile);
        resolve(webpBuffer);
      })
      .on("error", err => {
        try { fs.unlinkSync(inputFile); } catch { }
        try { fs.unlinkSync(outputFile); } catch { }
        reject(err);
      });
  });
}

module.exports = async (sock, msg, { from }) => {
  try {
    let mediaBuffer = null, isVideo = false;

    // Kirim gambar/video + caption "!stiker"
    if (msg.message?.imageMessage && msg.message.imageMessage.caption && msg.message.imageMessage.caption.toLowerCase().includes("!stiker")) {
      mediaBuffer = await downloadMediaMessage(
        msg,
        "buffer",
        {},
        { reuploadRequest: sock.ev }
      );
    } else if (msg.message?.videoMessage && msg.message.videoMessage.caption && msg.message.videoMessage.caption.toLowerCase().includes("!stiker")) {
      mediaBuffer = await downloadMediaMessage(
        msg,
        "buffer",
        {},
        { reuploadRequest: sock.ev }
      );
      isVideo = true;
    }
    // Reply ke gambar/video + !stiker
    else if (msg.message?.extendedTextMessage?.text && msg.message.extendedTextMessage.text.toLowerCase().startsWith("!stiker")) {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (quoted?.imageMessage) {
        mediaBuffer = await downloadMediaMessage(
          { message: quoted },
          "buffer",
          {},
          { reuploadRequest: sock.ev }
        );
      } else if (quoted?.videoMessage) {
        mediaBuffer = await downloadMediaMessage(
          { message: quoted },
          "buffer",
          {},
          { reuploadRequest: sock.ev }
        );
        isVideo = true;
      } else {
        await sock.sendMessage(from, { text: "Balas gambar/video dengan !stiker untuk membuat stiker." });
        return;
      }
    }

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer) || mediaBuffer.length < 100) {
      await sock.sendMessage(from, { text: "Gagal mengambil media (buffer kosong/rusak/format tidak didukung)." });
      return;
    }

    let stickerBuffer;
    if (isVideo) {
      // Proses video/gif ke webp animasi
      stickerBuffer = await videoToAnimatedWebp(mediaBuffer);
    } else {
      // Proses gambar ke webp static
      stickerBuffer = await sharp(mediaBuffer)
        .resize(512, 512, { fit: "inside" })
        .webp()
        .toBuffer();
    }

    // Tambah EXIF stiker WA
    const sticker = new Sticker(stickerBuffer, {
      pack: "Bot Fatur",
      author: "Coders-Family",
      type: StickerTypes.FULL
    });
    const stickerFinalBuffer = await sticker.toBuffer();

    // Kirim sebagai stiker
    await sock.sendMessage(from, { sticker: isVideo ? stickerBuffer : stickerFinalBuffer });
    return "Selesai"
  } catch (e) {
    await sock.sendMessage(from, { text: "Gagal proses stiker: " + e.message });
    return "Gagal"
  }
};
