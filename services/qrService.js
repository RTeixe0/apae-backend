import QRCode from "qrcode";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// 🔧 Configuração do cliente S3
const s3 = new S3Client({ region: process.env.S3_REGION });

// 🔧 Caminho da logo local
const logoPath = path.join(process.cwd(), "services/logo_apae.png");

export const generateQRCodeWithLogo = async (code) => {
  try {
    console.log("🔧 Gerando QR Code:", code);

    // 1️⃣ Gerar o QR Code como buffer PNG
    const qrBuffer = await QRCode.toBuffer(code, {
      errorCorrectionLevel: "H",
      type: "png",
      width: 500,
      margin: 1,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
    console.log("✅ QR Code gerado com sucesso.");

    // 2️⃣ Carregar e redimensionar a logo
    const logoBuffer = fs.readFileSync(logoPath);
    const logoResized = await sharp(logoBuffer)
      .resize({ width: 110 })
      .toBuffer();

    // 3️⃣ Obter metadados do QR
    const qrMetadata = await sharp(qrBuffer).metadata();
    const x = Math.floor((qrMetadata.width - 110) / 2);
    const y = Math.floor((qrMetadata.height - 110) / 2);

    // 4️⃣ Criar fundo branco arredondado e sobrepor a logo
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

    console.log("✅ QR Code finalizado com logo central.");

    // 5️⃣ Upload para o S3
    const key = `qrcodes/${code}.png`;
    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: finalBuffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000",
    };

    await s3.send(new PutObjectCommand(uploadParams));

    const publicUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
    console.log("✅ QR Code salvo no S3:", publicUrl);

    return publicUrl;
  } catch (error) {
    console.error("❌ Erro ao gerar QR Code:", error);
    throw error;
  }
};
