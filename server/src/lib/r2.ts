import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

/** True only when real R2 credentials are set (not placeholder values) */
export function isR2Configured(): boolean {
  const id = process.env.R2_ACCOUNT_ID ?? "";
  return id.length > 0 && !id.startsWith("your-");
}

const UPLOADS_DIR = path.join(__dirname, "../../../public/uploads");

/** Save file locally and return an absolute URL path for development use */
async function saveLocally(
  buffer: Buffer,
  originalName: string,
  folder: string
): Promise<string> {
  const dir = path.join(UPLOADS_DIR, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

/** Delete a locally stored file */
function deleteLocally(urlPath: string): void {
  const filePath = path.join(UPLOADS_DIR, "..", urlPath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/** Cloudflare R2 S3-compatible client */
export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME ?? "inmogestion-photos";
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

/**
 * Uploads a file buffer to R2 and returns the public CDN URL.
 * @param buffer - File contents as Buffer
 * @param originalName - Original filename (used for extension)
 * @param folder - Folder prefix inside the bucket (e.g. "properties")
 * @returns Public CDN URL for the uploaded file
 */
export async function uploadToR2(
  buffer: Buffer,
  originalName: string,
  folder = "properties"
): Promise<string> {
  if (!isR2Configured()) {
    return saveLocally(buffer, originalName, folder);
  }

  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  const key = `${folder}/${uuidv4()}${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: getMimeType(ext),
      CacheControl: "public, max-age=31536000",
    })
  );

  return `${PUBLIC_URL}/${key}`;
}

/**
 * Deletes a file from R2 by its storage key.
 * @param key - Storage key (path inside bucket), e.g. "properties/uuid.jpg"
 */
export async function deleteFromR2(url: string): Promise<void> {
  if (!isR2Configured()) {
    deleteLocally(url);
    return;
  }
  const key = keyFromUrl(url);
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Generates a temporary pre-signed URL for private file access (1 hour).
 */
export async function getPresignedUrl(key: string): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: 3600,
  });
}

/**
 * Extracts the R2 storage key from a full CDN URL.
 * e.g. "https://pub-xxx.r2.dev/properties/uuid.jpg" → "properties/uuid.jpg"
 */
export function keyFromUrl(url: string): string {
  return url.replace(`${PUBLIC_URL}/`, "");
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return map[ext] ?? "application/octet-stream";
}
