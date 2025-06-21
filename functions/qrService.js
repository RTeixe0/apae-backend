const QRCode = require("qrcode");
const { Jimp } = require("jimp");
const { storage } = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

exports.generateWithLogo = async (code) => {
  try {
    console.log("Iniciando geração do QR Code para:", code);

    const qrBuffer = await QRCode.toBuffer(code, {
      color: { dark: "#000000", light: "#FFFFFF" },
      margin: 1,
      width: 500,
      errorCorrectionLevel: "H",
    });

    console.log("QR Code gerado em buffer com sucesso");

    const bucket = storage().bucket("apae-eventos.firebasestorage.app"); // <-- CORRETO

    const [logoBuffer] = await bucket.file("logos/logo_apae.png").download();
    console.log("Logo carregada do bucket, tamanho:", logoBuffer?.length);

    const qr = await Jimp.read(qrBuffer); // <-- aqui
    const logo = await Jimp.read(logoBuffer); // <-- aqui

    logo.resize({
      w: Math.floor(qr.bitmap.width * 0.2),
      h: Jimp.AUTO,
    });

    const x = (qr.bitmap.width - logo.bitmap.width) / 2;
    const y = (qr.bitmap.height - logo.bitmap.height) / 2;

    qr.composite(logo, x, y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1,
    });

    const finalBuffer = await qr.getBuffer("image/png");

    const destination = `qrcodes/${code}.png`;
    const file = bucket.file(destination);
    const token = uuidv4();

    await file.save(finalBuffer, {
      metadata: {
        metadata: { firebaseStorageDownloadTokens: token },
        contentType: "image/png",
        cacheControl: "public, max-age=31536000",
      },
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
      bucket.name
    }/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
    console.log("QR Code com logo salvo no Storage:", publicUrl);

    return publicUrl;
  } catch (err) {
    console.error("Erro ao gerar QR Code com logo:", err);
    throw err;
  }
};
