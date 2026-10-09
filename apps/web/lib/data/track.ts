// Pure parsing for the tracking endpoint. Unit tested.

import { z } from "zod";
import { classifyReferral, type ReferrerSource } from "@privett/core";

export const MAX_BODY_BYTES = 2048;

const Payload = z.object({
  k: z.string().uuid(),
  r: z.string().max(255).optional().default(""),
  u: z.string().max(100).optional().default(""),
  p: z.string().max(4096).optional().default("/"),
});

/** Parses a beacon body. Returns null for anything malformed or not from an AI source. */
export function parseTrackEvent(body: string, sources: ReferrerSource[]): { key: string; source: string; landingPath: string } | null {
  if (!body || body.length > MAX_BODY_BYTES) return null;
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return null;
  }
  const parsed = Payload.safeParse(json);
  if (!parsed.success) return null;
  const { k, r, u, p } = parsed.data;
  const host = r.replace(/[^a-z0-9.-]/gi, "");
  const source = classifyReferral({ referrer: host ? `https://${host}/` : null, utmSource: u || null }, sources);
  if (!source) return null;
  return { key: k.toLowerCase(), source, landingPath: cleanPath(p) };
}

/** Path only: no query string or fragment, truncated to 512 characters. */
export function cleanPath(p: string): string {
  let path = p.split(/[?#]/)[0] ?? "/";
  if (!path.startsWith("/")) path = `/${path}`;
  return path.slice(0, 512);
}
