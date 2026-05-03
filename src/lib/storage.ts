import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";

const bucket = process.env.AWS_S3_BUCKET;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION ?? "us-east-1";
const cdnDomain = process.env.AWS_S3_CDN_DOMAIN;

const s3 = bucket && accessKeyId && secretAccessKey
  ? new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
  : null;

type UploadResult = { ok: boolean; url?: string; localPath?: string };

export async function persistPdf(filePath: string): Promise<UploadResult> {
  if (!s3 || !bucket) {
    return { ok: true, localPath: filePath };
  }

  const fileBuffer = await fs.readFile(filePath);
  const key = filePath.split("public\\").pop() ?? filePath;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: "application/pdf",
      ACL: "public-read",
    })
  );

  const url = cdnDomain ? `${cdnDomain}/${key}` : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return { ok: true, url };
}
