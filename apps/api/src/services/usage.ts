import type { FastifyRequest } from "fastify";
import type { ActivityEventType } from "@app/shared/constants";
import type { PropertyActivityResponse } from "@app/shared/schemas";
import { AppError, unauthorised } from "../errors.js";
import { getServiceClient, getUserClient } from "../integrations/supabase.js";

/**
 * Records a usage event in public.usage_events. usage_events has no insert
 * policy for authenticated users — the API writes via the service-role
 * client. Every billable action calls this from its own service.
 */
export async function recordUsageEvent(args: {
  agencyId: string;
  branchId?: string | null;
  userId?: string | null;
  propertyId?: string | null;
  eventType: ActivityEventType;
  unitsConsumed?: number;
  billable?: boolean;
  metadata?: Record<string, string>;
}): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.from("usage_events").insert({
    agency_id: args.agencyId,
    branch_id: args.branchId ?? null,
    user_id: args.userId ?? null,
    property_id: args.propertyId ?? null,
    event_type: args.eventType,
    units_consumed: args.unitsConsumed ?? 1,
    billable: args.billable ?? true,
    metadata: args.metadata ?? {},
  });
  if (error) {
    // Logging only — usage events must not block the user's action.
    console.error("recordUsageEvent failed", { error, args });
  }
}

// PostgREST embeds a to-one relationship as an object, but the generated types
// can widen it to an array, so accept both shapes.
type ActivityRow = {
  id: string;
  event_type: ActivityEventType;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, string> | null;
  users: { full_name: string } | { full_name: string }[] | null;
};

/**
 * Lists a property's activity log — its usage events, newest first, enriched
 * with the name of whoever performed each action. Read via the request-scoped
 * client so RLS scopes it to the caller's agency; the property_id filter then
 * narrows it to the one listing.
 */
export async function listPropertyActivity(
  request: FastifyRequest,
  propertyId: string,
): Promise<PropertyActivityResponse> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("usage_events")
    .select("id, event_type, user_id, created_at, metadata, users(full_name)")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    request.log.error({ err: error, propertyId }, "list_property_activity failed");
    throw new AppError({
      status: 500,
      code: "list_property_activity_failed",
      message: "Could not load activity.",
    });
  }
  const items = ((data ?? []) as ActivityRow[]).map((row) => {
    const actor = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      id: row.id,
      event_type: row.event_type,
      user_id: row.user_id,
      user_full_name: actor?.full_name ?? null,
      metadata: row.metadata ?? {},
      created_at: row.created_at,
    };
  });
  return { items };
}
