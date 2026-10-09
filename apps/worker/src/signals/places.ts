// Google Business Profile signals via the Places API (New).
// Text Search with a field mask, or Place Details when the place id is known.

import { domainMatches, normaliseAgentName, normaliseDomain, type GoogleBusinessSignal } from "@privett/core";
import { env } from "../env";
import { fetchJson, withRetry } from "../util/retry";

export interface PlaceResult {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  websiteUri?: string;
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: unknown;
  reviews?: { publishTime?: string }[];
}

const FIELDS = ["id", "displayName", "rating", "userRatingCount", "types", "websiteUri", "formattedAddress", "nationalPhoneNumber", "regularOpeningHours", "reviews"];

const COMPLETENESS_FIELDS: [keyof PlaceResult, string][] = [
  ["websiteUri", "website"],
  ["nationalPhoneNumber", "phone number"],
  ["regularOpeningHours", "opening hours"],
  ["formattedAddress", "address"],
  ["types", "categories"],
];

export function toSignal(p: PlaceResult | null, now = Date.now()): GoogleBusinessSignal {
  if (!p) {
    return { found: false, placeId: null, name: null, rating: null, reviewCount: null, recentReviews90d: null, categories: [], completeness: null, missingFields: [] };
  }
  const missing = COMPLETENESS_FIELDS.filter(([k]) => {
    const v = p[k];
    return v === undefined || v === null || (Array.isArray(v) && v.length === 0);
  }).map(([, label]) => label);
  const cutoff = now - 90 * 24 * 3600 * 1000;
  return {
    found: true,
    placeId: p.id ?? null,
    name: p.displayName?.text ?? null,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    // The API returns at most a handful of reviews, so this is a floor, not a count.
    recentReviews90d: p.reviews ? p.reviews.filter((r) => r.publishTime && Date.parse(r.publishTime) >= cutoff).length : null,
    categories: (p.types ?? []).filter((t) => !["point_of_interest", "establishment"].includes(t)),
    completeness: Math.round(((COMPLETENESS_FIELDS.length - missing.length) / COMPLETENESS_FIELDS.length) * 100),
    missingFields: missing,
  };
}

/** Pick the place for this agent: website domain match first, then exact normalised name. Never a loose guess. */
export function pickPlace(places: PlaceResult[], target: { name: string; domain: string | null }): PlaceResult | null {
  if (target.domain) {
    const byDomain = places.find((p) => domainMatches(normaliseDomain(p.websiteUri), target.domain));
    if (byDomain) return byDomain;
  }
  const want = normaliseAgentName(target.name);
  return places.find((p) => normaliseAgentName(p.displayName?.text ?? "") === want) ?? null;
}

export function placesEnabled() {
  return !!env.googlePlacesKey;
}

/** Returns the signal and the number of billable API calls made. */
export async function lookupPlace(target: {
  name: string;
  town: string;
  domain: string | null;
  placeId: string | null;
}): Promise<{ signal: GoogleBusinessSignal; calls: number }> {
  const headers = { "X-Goog-Api-Key": env.googlePlacesKey, "content-type": "application/json" };
  if (target.placeId) {
    const p = await withRetry(() =>
      fetchJson<PlaceResult>(`https://places.googleapis.com/v1/places/${encodeURIComponent(target.placeId!)}`, {
        headers: { ...headers, "X-Goog-FieldMask": FIELDS.join(",") },
        timeoutMs: 20_000,
      }),
    );
    return { signal: toSignal(p), calls: 1 };
  }
  const res = await withRetry(() =>
    fetchJson<{ places?: PlaceResult[] }>("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { ...headers, "X-Goog-FieldMask": FIELDS.map((f) => `places.${f}`).join(",") },
      body: JSON.stringify({ textQuery: `${target.name} ${target.town}`, regionCode: "GB" }),
      timeoutMs: 20_000,
    }),
  );
  return { signal: toSignal(pickPlace(res.places ?? [], target)), calls: 1 };
}
