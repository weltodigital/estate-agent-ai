import type { FastifyRequest } from "fastify";
import type { PropertyStatus } from "@app/shared/constants";
import { PROPERTY_STATUSES } from "@app/shared/constants";
import type {
  CreatePropertyRequest,
  Property,
  PropertyListQuery,
  PropertyListResponse,
  UpdatePropertyRequest,
} from "@app/shared/schemas";
import { AppError, badRequest, notFound, unauthorised } from "../errors.js";
import { getUserClient } from "../integrations/supabase.js";
import { lookupEpcByPostcode } from "./epc.js";
import { assertWithinQuota } from "./quota.js";
import { recordUsageEvent } from "./usage.js";

export async function listProperties(
  request: FastifyRequest,
  query: PropertyListQuery,
): Promise<PropertyListResponse> {
  if (!request.user || !request.agencyId) {
    throw unauthorised();
  }
  const supabase = getUserClient(request.user.accessToken);

  // Column-level filters run in the database to shrink the working set. The
  // computed-count filters and sorts (stagings, enhancements) can't — they
  // aren't columns — so they're applied in memory below over a capped set.
  const MAX_WORKING_SET = 1000;
  let q = supabase.from("properties").select("*");
  if (query.status) q = q.eq("status", query.status);
  if (query.branch_id) q = q.eq("branch_id", query.branch_id);
  if (query.q) {
    const term = `%${query.q.replace(/[%_]/g, "")}%`;
    q = q.or(`address_line_1.ilike.${term},town.ilike.${term},postcode.ilike.${term}`);
  }
  if (query.min_price !== undefined) q = q.gte("price_pence", query.min_price);
  if (query.max_price !== undefined) q = q.lte("price_pence", query.max_price);
  if (query.created_after) q = q.gte("created_at", query.created_after);
  if (query.created_before) q = q.lte("created_at", query.created_before);
  q = q.limit(MAX_WORKING_SET);

  const { data, error } = await q;
  if (error) {
    request.log.error({ err: error }, "list_properties failed");
    throw new AppError({
      status: 500,
      code: "list_properties_failed",
      message: "Could not load properties.",
    });
  }

  const properties = (data ?? []) as Property[];
  const assetCounts = await countPropertyAssets(
    supabase,
    properties.map((p) => p.id),
  );
  let items = properties.map((p) => ({
    ...p,
    stats: {
      photo_enhancements: assetCounts.enhanced[p.id] ?? 0,
      virtual_stagings: assetCounts.staged[p.id] ?? 0,
      // A property has at most one description / EPC, so these read as 0 or 1.
      ai_descriptions: p.description && p.description.trim().length > 0 ? 1 : 0,
      floor_plans: assetCounts.floorPlans[p.id] ?? 0,
      epc_details: p.epc_current_rating ? 1 : 0,
    },
  }));

  if (query.has_staging) items = items.filter((it) => it.stats.virtual_stagings > 0);
  if (query.has_enhancements) items = items.filter((it) => it.stats.photo_enhancements > 0);

  // created_at is ISO-8601 with a fixed offset, so string compare = chronological.
  const byCreatedAt = (a: (typeof items)[number], b: (typeof items)[number]) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
  const direction = query.order === "asc" ? 1 : -1;
  items.sort((a, b) => {
    let cmp: number;
    switch (query.sort) {
      case "price":
        cmp = a.price_pence - b.price_pence;
        break;
      case "status":
        cmp = PROPERTY_STATUSES.indexOf(a.status) - PROPERTY_STATUSES.indexOf(b.status);
        break;
      case "virtual_stagings":
        cmp = a.stats.virtual_stagings - b.stats.virtual_stagings;
        break;
      case "photo_enhancements":
        cmp = a.stats.photo_enhancements - b.stats.photo_enhancements;
        break;
      default:
        cmp = byCreatedAt(a, b);
    }
    // Newest-first tiebreak keeps equal keys deterministic across requests.
    return (cmp !== 0 ? cmp : byCreatedAt(a, b)) * direction;
  });

  const total = items.length;
  const page = items.slice(query.offset, query.offset + query.limit);
  return { items: page, total };
}

/**
 * Counts the photo enhancements, virtual stagings, and floor plans attached to
 * each of the given properties. RLS on the user client keeps it agency-scoped;
 * we fetch the minimal columns and tally in memory rather than per-property
 * round-trips. Description/EPC counts come straight off the property row.
 */
async function countPropertyAssets(
  supabase: ReturnType<typeof getUserClient>,
  propertyIds: string[],
): Promise<{
  enhanced: Record<string, number>;
  staged: Record<string, number>;
  floorPlans: Record<string, number>;
}> {
  const enhanced: Record<string, number> = {};
  const staged: Record<string, number> = {};
  const floorPlans: Record<string, number> = {};
  if (propertyIds.length === 0) return { enhanced, staged, floorPlans };

  // Run both aggregations concurrently — they're independent round trips.
  const [photosRes, plansRes] = await Promise.all([
    supabase
      .from("property_photos")
      .select("property_id, enhanced_url, staged_url")
      .in("property_id", propertyIds),
    supabase.from("floor_plans").select("property_id").in("property_id", propertyIds),
  ]);

  for (const row of (photosRes.data ?? []) as Array<{
    property_id: string;
    enhanced_url: string | null;
    staged_url: string | null;
  }>) {
    if (row.enhanced_url) enhanced[row.property_id] = (enhanced[row.property_id] ?? 0) + 1;
    if (row.staged_url) staged[row.property_id] = (staged[row.property_id] ?? 0) + 1;
  }
  for (const row of (plansRes.data ?? []) as Array<{ property_id: string }>) {
    floorPlans[row.property_id] = (floorPlans[row.property_id] ?? 0) + 1;
  }

  return { enhanced, staged, floorPlans };
}

export async function getProperty(request: FastifyRequest, id: string): Promise<Property> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
  if (error) {
    request.log.error({ err: error, id }, "get_property failed");
    throw new AppError({
      status: 500,
      code: "get_property_failed",
      message: "Could not load property.",
    });
  }
  if (!data) throw notFound("Property");
  return data as Property;
}

export async function createProperty(
  request: FastifyRequest,
  payload: CreatePropertyRequest,
): Promise<Property> {
  if (!request.user || !request.agencyId) throw unauthorised();

  await assertWithinQuota({
    agencyId: request.agencyId,
    eventType: "listing_created",
  });

  const supabase = getUserClient(request.user.accessToken);

  // RLS asserts agency match; we still set it explicitly so the insert isn't
  // rejected for missing required column.
  const { data, error } = await supabase
    .from("properties")
    .insert({
      ...payload,
      // property_type has no DB default (bedrooms/bathrooms/price do), so fill
      // it when omitted at creation.
      property_type: payload.property_type ?? "other",
      agency_id: request.agencyId,
      created_by: request.user.id,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23503") {
      // Foreign key — most likely a branch_id from another agency.
      throw badRequest("Invalid branch for this agency.");
    }
    request.log.error({ err: error }, "create_property failed");
    throw new AppError({
      status: 500,
      code: "create_property_failed",
      message: "Could not create property.",
    });
  }

  // Side-effect: ledger entry. Service-role write, see services/usage.
  await recordUsageEvent({
    agencyId: request.agencyId,
    branchId: data.branch_id,
    userId: request.user.id,
    propertyId: data.id,
    eventType: "listing_created",
    billable: false,
  });

  // Warm the EPC cache for the property's postcode in the background. We
  // don't auto-apply a certificate — the user picks the right address — but
  // having the cache primed makes the EPC tab feel instant.
  void lookupEpcByPostcode(request, data.postcode).catch((err: unknown) => {
    request.log.warn({ err, propertyId: data.id }, "epc warm-cache failed");
  });

  return data as Property;
}

export async function updateProperty(
  request: FastifyRequest,
  id: string,
  payload: UpdatePropertyRequest,
): Promise<Property> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);

  // Note the prior status before the update so a transition can be logged to
  // the property's activity feed. Only read it when a status change is possible.
  let previousStatus: PropertyStatus | null = null;
  if (payload.status !== undefined) {
    const { data: current } = await supabase
      .from("properties")
      .select("status")
      .eq("id", id)
      .maybeSingle<{ status: PropertyStatus }>();
    previousStatus = current?.status ?? null;
  }

  const { data, error } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    request.log.error({ err: error, id }, "update_property failed");
    throw new AppError({
      status: 500,
      code: "update_property_failed",
      message: "Could not update property.",
    });
  }
  if (!data) throw notFound("Property");

  if (
    payload.status !== undefined &&
    previousStatus !== null &&
    previousStatus !== payload.status
  ) {
    // Audit-only ledger entry, not a billing meter. Service-role write.
    await recordUsageEvent({
      agencyId: request.agencyId,
      branchId: data.branch_id,
      userId: request.user.id,
      propertyId: data.id,
      eventType: "status_changed",
      billable: false,
      metadata: { from: previousStatus, to: payload.status },
    });
  }

  return data as Property;
}

export async function archiveProperty(request: FastifyRequest, id: string): Promise<Property> {
  return updateProperty(request, id, { status: "withdrawn" });
}

export async function deleteProperty(request: FastifyRequest, id: string): Promise<void> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { error, count } = await supabase
    .from("properties")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) {
    request.log.error({ err: error, id }, "delete_property failed");
    throw new AppError({
      status: 500,
      code: "delete_property_failed",
      message: "Could not delete property.",
    });
  }
  if ((count ?? 0) === 0) throw notFound("Property");
}
