import "server-only";
import { chooseCounty, type PlaceMatch, type PostcodeArea } from "@/lib/county-choice";

// postcodes.io: free, open data (ONS and Ordnance Survey), no key needed.
const API = "https://api.postcodes.io";
const TIMEOUT_MS = 4000;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { result: T | null }).result;
  } catch {
    return null;
  }
}

/**
 * The county to add to questions about this town, or null when the town's
 * name is unique in the UK (or we can't tell: a failed lookup never blocks
 * saving a branch).
 */
export async function lookupCounty(postcode: string | null, town: string): Promise<string | null> {
  const pc = postcode?.replace(/\s+/g, "");
  if (!pc || !town.trim()) return null;
  const [area, places] = await Promise.all([
    getJson<PostcodeArea>(`${API}/postcodes/${encodeURIComponent(pc)}`),
    getJson<PlaceMatch[]>(`${API}/places?q=${encodeURIComponent(town.trim())}&limit=100`),
  ]);
  if (!area || !places) return null;
  return chooseCounty(area, places, town);
}
