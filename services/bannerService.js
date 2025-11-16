import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

dotenv.config();

const REGION = process.env.S3_REGION;
const BUCKET = process.env.S3_BUCKET;

const s3 = new S3Client({ region: REGION });

export async function uploadBanner(buffer, mimeType) {
  try {
    const key = `banners/banner-${uuidv4()}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: "public, max-age=31536000",
      })
    );

    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    console.log("📤 Banner enviado:", url);

    return url;
  } catch (err) {
    console.error("Erro upload banner:", err);
    throw new Error("Falha ao enviar banner");
  }
}
