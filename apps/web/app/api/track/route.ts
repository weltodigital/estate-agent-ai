import { getReferrerSources } from "@privett/core";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { MAX_BODY_BYTES, parseTrackEvent } from "@/lib/data/track";

// Public endpoint for the tracking snippet. Stores only: branch, AI source,
// landing path, timestamp. No IPs, user agents or cookies. Always 204 so the
// response reveals nothing about whether a key exists.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const noContent = () => new Response(null, { status: 204, headers: CORS });

// Brief in-memory cache of tracking key -> branch, per server instance.
const CACHE_MS = 5 * 60_000;
const cache = new Map<string, { branch: { id: string; org_id: string } | null; exp: number }>();

async function branchForKey(key: string) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.branch;
  const { data } = await getSupabaseAdminClient()
    .from("branches")
    .select("id, org_id")
    .eq("tracking_key", key)
    .is("archived_at", null)
    .maybeSingle();
  const branch = (data as { id: string; org_id: string } | null) ?? null;
  if (cache.size > 5000) cache.clear();
  cache.set(key, { branch, exp: Date.now() + CACHE_MS });
  return branch;
}

export function OPTIONS() {
  return noContent();
}

export async function POST(request: Request) {
  try {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_BODY_BYTES) return noContent();
    const event = parseTrackEvent((await request.text()).slice(0, MAX_BODY_BYTES + 1), getReferrerSources());
    if (!event) return noContent();
    const branch = await branchForKey(event.key);
    if (!branch) return noContent();
    await getSupabaseAdminClient().from("referral_events").insert({
      org_id: branch.org_id,
      branch_id: branch.id,
      source: event.source,
      landing_path: event.landingPath,
    });
  } catch (err) {
    console.error("track: failed to record event", err);
  }
  return noContent();
}
