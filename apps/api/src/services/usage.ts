import type { UsageEventType } from "@app/shared/constants";

/**
 * Records a billable usage event in the same transaction as the action that
 * triggered it.
 *
 * Stubbed until DB client wiring lands.
 */
export async function recordUsageEvent(_args: {
  agencyId: string;
  branchId?: string | null;
  userId?: string | null;
  propertyId?: string | null;
  eventType: UsageEventType;
  unitsConsumed?: number;
  billable?: boolean;
}): Promise<void> {
  // TODO(phase-1): Insert into public.usage_events via service-role client.
  return;
}
