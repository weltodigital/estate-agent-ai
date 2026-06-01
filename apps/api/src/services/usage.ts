import type { UsageEventType } from "@app/shared/constants";
import { getServiceClient } from "../integrations/supabase.js";

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
  eventType: UsageEventType;
  unitsConsumed?: number;
  billable?: boolean;
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
  });
  if (error) {
    // Logging only — usage events must not block the user's action.
    console.error("recordUsageEvent failed", { error, args });
  }
}
