import QRCode from "qrcode";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.S3_REGION });
const BUCKET = process.env.S3_BUCKET;

export async function generateQRCodeWithLogo(code) {
  console.log("🔧 Gerando QR Code:", code);

  const qrBuffer = await QRCode.toBuffer(code, {
    errorCorrectionLevel: "H",
    type: "png",
    width: 500,
    margin: 1,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const logoPath = "./assets/logo_apae.png";
  const logoBuffer = await sharp(logoPath).resize({ width: 110 }).toBuffer();
  const qrMeta = await sharp(qrBuffer).metadata();
  const x = Math.floor((qrMeta.width - 110) / 2);
  const y = Math.floor((qrMeta.height - 110) / 2);

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
      { input: logoBuffer, top: y, left: x },
    ])
    .png()
    .toBuffer();

  const key = `qrcodes/${code}.png`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: finalBuffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000",
    })
  );

  return `https://${BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
}
