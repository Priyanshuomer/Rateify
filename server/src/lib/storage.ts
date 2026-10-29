import { randomUUID } from "crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { logger } from "./logger";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

let client: S3Client | null = null;

function getClient(): S3Client {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    throw ApiError.serviceUnavailable("File storage is not configured", "STORAGE_NOT_CONFIGURED");
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return client;
}

/** Verify real file type from magic bytes (client mimetype can be spoofed). */
export function detectImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function uploadImage(params: { buffer: Buffer; folder: string }) {
  const mime = detectImageType(params.buffer);
  if (!mime) throw ApiError.badRequest("Unsupported or corrupt image. Allowed: JPEG, PNG, WebP", "INVALID_IMAGE");

  const s3 = getClient();
  const key = `${params.folder}/${randomUUID()}.${EXTENSIONS[mime]}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: params.buffer,
      ContentType: mime,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  const url = `${(env.R2_PUBLIC_URL as string).replace(/\/+$/, "")}/${key}`;
  return { key, url };
}

/** Best-effort delete: never throws (orphaned objects are preferable to failed requests). */
export async function deleteObject(key?: string | null) {
  if (!key) return;
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
  } catch (err) {
    logger.warn({ err, key }, "Failed to delete object from storage");
  }
}