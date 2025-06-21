const QRCode = require("qrcode");
const Jimp = require("jimp").default;
const { storage } = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

exports.generateWithLogo = async (code) => {
  try {
    // 1. Gera QR em buffer
    const qrBuffer = await QRCode.toBuffer(code, {
      color: { dark: "#000000", light: "#FFFFFF" },
      margin: 1,
      width: 500,
      errorCorrectionLevel: "H",
    });

    // 2. Lê QR e logo como Jimp
    const qr = await Jimp.read(qrBuffer);
    const logoPath = path.join(__dirname, "/assets/logo_apae.png");
    const logo = await Jimp.read(logoPath);

    // 3. Redimensiona logo
    logo.resize(qr.bitmap.width * 0.2, Jimp.AUTO);

    const x = (qr.bitmap.width - logo.bitmap.width) / 2;
    const y = (qr.bitmap.height - logo.bitmap.height) / 2;
    qr.composite(logo, x, y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1,
    });

    // 4. Converte imagem final para buffer
    const finalBuffer = await qr.getBufferAsync(Jimp.MIME_PNG);

    // 5. Envia para Storage
    const destination = `qrcodes/${code}.png`;
    const file = storage().bucket().file(destination);
    const token = uuidv4();

    await file.save(finalBuffer, {
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
        contentType: "image/png",
        cacheControl: "public, max-age=31536000",
      },
    });

    // 6. Retorna URL
    return `https://firebasestorage.googleapis.com/v0/b/${
      bucket.name
    }/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
  } catch (err) {
    console.error("Erro ao gerar QR Code com logo:", err);
    throw err;
  }
};
