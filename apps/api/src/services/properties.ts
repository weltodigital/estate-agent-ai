import type { FastifyRequest } from "fastify";
import type { PropertyStatus } from "@app/shared/constants";
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
  let q = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (query.status) q = q.eq("status", query.status);
  if (query.branch_id) q = q.eq("branch_id", query.branch_id);
  if (query.q) {
    const term = `%${query.q.replace(/[%_]/g, "")}%`;
    q = q.or(`address_line_1.ilike.${term},town.ilike.${term},postcode.ilike.${term}`);
  }
  q = q.range(query.offset, query.offset + query.limit - 1);
  const { data, error, count } = await q;
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
  const items = properties.map((p) => ({
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
  return { items, total: count ?? 0 };
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

  const { data: photos } = await supabase
    .from("property_photos")
    .select("property_id, enhanced_url, staged_url")
    .in("property_id", propertyIds);
  for (const row of (photos ?? []) as Array<{
    property_id: string;
    enhanced_url: string | null;
    staged_url: string | null;
  }>) {
    if (row.enhanced_url) enhanced[row.property_id] = (enhanced[row.property_id] ?? 0) + 1;
    if (row.staged_url) staged[row.property_id] = (staged[row.property_id] ?? 0) + 1;
  }

  const { data: plans } = await supabase
    .from("floor_plans")
    .select("property_id")
    .in("property_id", propertyIds);
  for (const row of (plans ?? []) as Array<{ property_id: string }>) {
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
