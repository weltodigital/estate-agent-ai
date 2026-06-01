import { createHmac, timingSafeEqual } from "node:crypto";
import { loadEnv } from "../env.js";

/**
 * Shared HMAC helpers used to authenticate orchestrator callbacks. Both sides
 * sign the raw request body bytes with SHA-256 and AI_CALLBACK_SECRET; the
 * signature is sent as `X-Orchestrator-Signature: sha256=<hex>`.
 */
export function getCallbackSecret(): string {
  const env = loadEnv();
  if (!env.AI_CALLBACK_SECRET) {
    throw new Error("AI_CALLBACK_SECRET is not configured.");
  }
  return env.AI_CALLBACK_SECRET;
}

export function signBody(body: string): string {
  return `sha256=${createHmac("sha256", getCallbackSecret()).update(body).digest("hex")}`;
}

export function verifySignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = signBody(rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
