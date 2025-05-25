const QRCode = require('qrcode');
const { bucket } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

exports.generate = async (code) => {
  const tempFilePath = path.join(__dirname, `${code}.png`);

  // 1. Gera QR Code localmente
  await QRCode.toFile(tempFilePath, code);

  // 2. Faz upload pro Firebase Storage
  const destination = `qrcodes/${code}.png`;
  const metadata = {
    metadata: {
      firebaseStorageDownloadTokens: uuidv4(),
    },
    contentType: 'image/png',
    cacheControl: 'public, max-age=31536000',
  };

  await bucket.upload(tempFilePath, {
    destination,
    metadata,
  });

  // 3. Remove arquivo temporário local
  fs.unlinkSync(tempFilePath);

  // 4. Retorna a URL pública
  const file = bucket.file(destination);
  const token = metadata.metadata.firebaseStorageDownloadTokens;

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`;
};
