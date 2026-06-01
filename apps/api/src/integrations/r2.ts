import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loadEnv } from "../env.js";

let client: S3Client | undefined;

function getClient(): S3Client {
  if (!client) {
    const env = loadEnv();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

export function bucketName(): string {
  return loadEnv().R2_BUCKET_NAME;
}

export function publicUrl(key: string): string {
  const base = loadEnv().R2_PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${base}/${key}`;
}

/**
 * Sanitises a filename for use inside an R2 key. Strips path separators,
 * lower-cases, collapses runs of non-alphanumerics.
 */
export function sanitiseFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds the canonical key for a property photo upload.
 */
export function buildPhotoKey(args: {
  agencyId: string;
  propertyId: string;
  photoId: string;
  filename: string;
}): string {
  return `agencies/${args.agencyId}/properties/${args.propertyId}/photos/${args.photoId}/${sanitiseFilename(args.filename)}`;
}

export async function createSignedPutUrl(args: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucketName(),
    Key: args.key,
    ContentType: args.contentType,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: args.expiresInSeconds ?? 300 });
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}
