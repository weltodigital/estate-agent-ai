import { z } from "zod";
import { ACTIVITY_EVENT_TYPES, USAGE_EVENT_TYPES } from "../constants";

export const usageEventSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  branch_id: z.string().uuid().nullable(),
  user_id: z.string().uuid().nullable(),
  property_id: z.string().uuid().nullable(),
  event_type: z.enum(USAGE_EVENT_TYPES),
  units_consumed: z.number().int().min(0),
  billable: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
});
export type UsageEvent = z.infer<typeof usageEventSchema>;

/**
 * A single entry in a property's activity log — a usage event surfaced to the
 * user, enriched with the name of whoever performed it.
 */
export const propertyActivityEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.enum(ACTIVITY_EVENT_TYPES),
  user_id: z.string().uuid().nullable(),
  user_full_name: z.string().nullable(),
  // Per-event detail. For a status change: { from, to }. Empty for the rest.
  metadata: z.record(z.string(), z.string()),
  created_at: z.string().datetime({ offset: true }),
});
export type PropertyActivityEvent = z.infer<typeof propertyActivityEventSchema>;

export const propertyActivityResponseSchema = z.object({
  items: z.array(propertyActivityEventSchema),
});
export type PropertyActivityResponse = z.infer<typeof propertyActivityResponseSchema>;
