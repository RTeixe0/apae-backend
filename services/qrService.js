// services/qrService.js
import dotenv from "dotenv";
import QRCode from "qrcode";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import fs from "fs";

dotenv.config();

// 🧩 Configura S3
const REGION = process.env.S3_REGION;
const BUCKET = process.env.S3_BUCKET;

if (!REGION || !BUCKET) {
  console.error(
    "❌ ERRO: Variáveis de ambiente S3_REGION ou S3_BUCKET ausentes!"
  );
  throw new Error("Configuração AWS S3 inválida.");
}

const s3 = new S3Client({ region: REGION });

/**
 * ✅ Gera um QR Code com logo central e envia para S3
 * @param {string} code - código único do ingresso (ex: APAE-XYZ123)
 * @returns {Promise<string>} URL pública do QR code no S3
 */
export async function generateQRCodeWithLogo(code) {
  try {
    console.log(`🎨 Gerando QR Code para: ${code}`);

    // 🔹 Cria QR básico
    const qrBuffer = await QRCode.toBuffer(code, {
      errorCorrectionLevel: "H",
      type: "png",
      width: 500,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // 🔹 Caminho absoluto da logo (garante compatibilidade em EC2/Docker)
    const logoPath = path.resolve("assets/logo_apae.png");
    if (!fs.existsSync(logoPath)) {
      console.warn(
        `⚠️ Logo não encontrada em: ${logoPath} — QR será gerado sem logo.`
      );
    }

    let finalBuffer = qrBuffer;

    if (fs.existsSync(logoPath)) {
      const logoBuffer = await sharp(logoPath)
        .resize({ width: 110 })
        .toBuffer();
      const qrMeta = await sharp(qrBuffer).metadata();
      const x = Math.floor((qrMeta.width - 110) / 2);
      const y = Math.floor((qrMeta.height - 110) / 2);

      finalBuffer = await sharp(qrBuffer)
        .composite([
          {
            input: Buffer.from(
              `<svg><rect x="0" y="0" width="110" height="110" fill="white" rx="8" ry="8"/></svg>`
            ),
            top: y,
            left: x,
            blend: "over",
          },
          { input: logoBuffer, top: y, left: x },
        ])
        .png()
        .toBuffer();
    }

    // 🔹 Nome único do arquivo (evita conflitos)
    const key = `qrcodes/${code}-${uuidv4()}.png`;

    // 🔹 Upload para S3
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: finalBuffer,
        ContentType: "image/png",
        CacheControl: "public, max-age=31536000",
      })
    );

    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    console.log(`✅ QR Code enviado ao S3: ${url}`);

    return url;
  } catch (err) {
    console.error("❌ Erro ao gerar ou enviar QR Code:", err);
    throw new Error("Falha ao gerar QR Code.");
  }
}
