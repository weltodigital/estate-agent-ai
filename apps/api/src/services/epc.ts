import type { FastifyRequest } from "fastify";
import type { EpcLookupResponse } from "@app/shared/schemas";
import { AppError, unauthorised } from "../errors.js";
import { EpcNotConfiguredError, searchByPostcode, type EpcLookupRow } from "../integrations/epc.js";
import { getServiceClient } from "../integrations/supabase.js";
import { assertWithinQuota } from "./quota.js";
import { recordUsageEvent } from "./usage.js";

type EpcCacheRow = { postcode_normalised: string; results: EpcLookupRow[]; expires_at: string };

function normalisePostcode(postcode: string): string {
  return postcode.replace(/\s+/g, "").toUpperCase();
}

/**
 * Look up EPCs by postcode. Reads from epc_cache first; on miss fetches the
 * GOV.UK API, stores the result with a 7-day TTL, and records a single
 * billable `epc_lookup` event.
 *
 * Why service-role: the epc_cache table has no policies for authenticated
 * users (the cache is agency-agnostic; the API mediates all access).
 */
export async function lookupEpcByPostcode(
  request: FastifyRequest,
  postcode: string,
): Promise<EpcLookupResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const normalised = normalisePostcode(postcode);
  const supabase = getServiceClient();

  // Cache hits don't burn quota — only a true upstream call does. We check
  // before the upstream below if we miss the cache.

  const { data: cached } = await supabase
    .from("epc_cache")
    .select("postcode_normalised, results, expires_at")
    .eq("postcode_normalised", normalised)
    .maybeSingle<EpcCacheRow>();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return { results: cached.results };
  }

  // Cache miss — this counts against the quota.
  await assertWithinQuota({
    agencyId: request.agencyId,
    eventType: "epc_lookup",
  });

  let rows: EpcLookupRow[];
  try {
    rows = await searchByPostcode(postcode);
  } catch (err) {
    if (err instanceof EpcNotConfiguredError) {
      throw new AppError({
        status: 503,
        code: "epc_not_configured",
        message: "EPC lookups are not enabled on this environment.",
      });
    }
    request.log.error({ err }, "epc lookup failed");
    if (cached) {
      // Stale cache is still useful when the upstream is down.
      return { results: cached.results };
    }
    throw new AppError({
      status: 502,
      code: "epc_upstream_failed",
      message: "Could not reach the EPC Register.",
    });
  }

  await supabase.from("epc_cache").upsert(
    {
      postcode_normalised: normalised,
      results: rows,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "postcode_normalised" },
  );

  await recordUsageEvent({
    agencyId: request.agencyId,
    userId: request.user.id,
    eventType: "epc_lookup",
    billable: false,
  });

  return { results: rows };
}
