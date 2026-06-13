import type { FastifyRequest } from "fastify";
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
  return { items: (data ?? []) as Property[], total: count ?? 0 };
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
