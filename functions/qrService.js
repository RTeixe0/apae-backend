const QRCode = require("qrcode");
const sharp = require("sharp");
const { storage } = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

exports.generateWithLogo = async (code) => {
  try {
    console.log("🔧 Gerando QR Code com Sharp:", code);

    // Gera QR Code em PNG buffer
    const qrBuffer = await QRCode.toBuffer(code, {
      errorCorrectionLevel: "H",
      type: "png",
      width: 500,
      margin: 1,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    console.log("✅ QR Code gerado");

    // Baixa logo do bucket
    const bucket = storage().bucket("apae-eventos.firebasestorage.app");
    const [logoBuffer] = await bucket.file("logos/logo_apae.png").download();
    console.log("✅ Logo baixada do bucket");

    // Redimensiona a logo (ex: 22% do QR)
    const logoResized = await sharp(logoBuffer)
      .resize({ width: 110 }) // 500 * 0.22
      .toBuffer();

    // Calcula posição central
    const qrMetadata = await sharp(qrBuffer).metadata();
    const x = Math.floor((qrMetadata.width - 110) / 2);
    const y = Math.floor((qrMetadata.height - 110) / 2);

    // Composita a logo no centro
    const finalBuffer = await sharp(qrBuffer)
      .composite([
        {
          input: Buffer.from(
            `<svg><rect x="0" y="0" width="110" height="110" fill="white" rx="8" ry="8"/></svg>`
          ),
          top: y,
          left: x,
          blend: "over",
        },
        { input: logoResized, top: y, left: x },
      ])
      .png()
      .toBuffer();

    // Envia para o Storage
    const destination = `qrcodes/${code}.png`;
    const token = uuidv4();
    const file = bucket.file(destination);

    await file.save(finalBuffer, {
      metadata: {
        contentType: "image/png",
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
        cacheControl: "public, max-age=31536000",
      },
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
      bucket.name
    }/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;

    console.log("✅ QR Code com logo salvo:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.error("❌ Erro com Sharp:", err);
    throw err;
  }
};
