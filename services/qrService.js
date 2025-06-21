const QRCode = require("qrcode");
const Jimp = require("jimp").default;
const { bucket } = require("../config/firebase");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

exports.generate = async (code) => {
  const tempDir = path.join(__dirname, "../temp");
  const qrPath = path.join(tempDir, `${code}.png`);
  const finalPath = path.join(tempDir, `${code}_logo.png`);
  const logoPath = path.join(__dirname, "../assets/logo_apae.png");

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    await QRCode.toFile(qrPath, code, {
      color: { dark: "#000000", light: "#FFFFFF" },
      margin: 1,
      width: 500,
    });

    const [qr, logo] = await Promise.all([
      Jimp.read(qrPath),
      Jimp.read(logoPath),
    ]);

    logo.resize(qr.bitmap.width * 0.2, Jimp.AUTO);
    const x = (qr.bitmap.width - logo.bitmap.width) / 2;
    const y = (qr.bitmap.height - logo.bitmap.height) / 2;
    qr.composite(logo, x, y);

    await qr.writeAsync(finalPath);

    const destination = `qrcodes/${code}.png`;
    const token = uuidv4();
    const metadata = {
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
      contentType: "image/png",
      cacheControl: "public, max-age=31536000",
    };

    await bucket.upload(finalPath, {
      destination,
      metadata,
    });

    fs.unlinkSync(qrPath);
    fs.unlinkSync(finalPath);

    // 7. Retorna URL pública
    return `https://firebasestorage.googleapis.com/v0/b/${
      bucket.name
    }/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
  } catch (err) {
    console.error("Erro ao gerar QR Code com logo:", err);
    throw err;
  }
};
