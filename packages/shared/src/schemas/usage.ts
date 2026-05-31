import { z } from "zod";
import { USAGE_EVENT_TYPES } from "../constants.js";

export const usageEventSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  branch_id: z.string().uuid().nullable(),
  user_id: z.string().uuid().nullable(),
  property_id: z.string().uuid().nullable(),
  event_type: z.enum(USAGE_EVENT_TYPES),
  units_consumed: z.number().int().min(0),
  billable: z.boolean(),
  created_at: z.string().datetime(),
});
export type UsageEvent = z.infer<typeof usageEventSchema>;
