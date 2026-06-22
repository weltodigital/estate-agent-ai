import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
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
      // AWS SDK v3 (>=3.729) adds a default CRC32 checksum to every PutObject.
      // For presigned URLs that bakes an `x-amz-checksum-crc32` requirement
      // into the URL that a browser PUT never satisfies — R2 then rejects the
      // upload (403). R2 doesn't need these; only add checksums when an
      // operation strictly requires them so presigned PUTs stay header-clean.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
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

/**
 * Builds the key for an object-removal mask. Masks are throwaway inputs to the
 * cleanup model, kept under a per-photo `masks/` prefix.
 */
export function buildMaskKey(args: { agencyId: string; photoId: string; maskId: string }): string {
  return `agencies/${args.agencyId}/masks/${args.photoId}/${args.maskId}.png`;
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

/**
 * Presigned GET URL that forces a download with the given filename. The public
 * r2.dev host doesn't send CORS headers, so the browser can't blob-download an
 * image directly — this hands back a URL that responds with
 * `Content-Disposition: attachment`, which the browser saves on navigation.
 */
export async function createSignedDownloadUrl(args: {
  key: string;
  filename: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const safeName = args.filename.replace(/["\\]/g, "");
  const cmd = new GetObjectCommand({
    Bucket: bucketName(),
    Key: args.key,
    ResponseContentDisposition: `attachment; filename="${safeName}"`,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: args.expiresInSeconds ?? 300 });
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}
