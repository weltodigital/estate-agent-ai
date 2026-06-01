import { z } from "zod";
import { SUBSCRIPTION_TIERS, USAGE_EVENT_TYPES } from "../constants";

export const checkoutSessionRequestSchema = z.object({
  tier: z.enum(SUBSCRIPTION_TIERS),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});
export type CheckoutSessionRequest = z.infer<typeof checkoutSessionRequestSchema>;

export const checkoutSessionResponseSchema = z.object({
  url: z.string().url(),
});
export type CheckoutSessionResponse = z.infer<typeof checkoutSessionResponseSchema>;

export const portalSessionRequestSchema = z.object({
  return_url: z.string().url(),
});
export type PortalSessionRequest = z.infer<typeof portalSessionRequestSchema>;

export const portalSessionResponseSchema = z.object({
  url: z.string().url(),
});
export type PortalSessionResponse = z.infer<typeof portalSessionResponseSchema>;

export const billingUsageSchema = z.object({
  event_type: z.enum(USAGE_EVENT_TYPES),
  used: z.number().int().min(0),
  limit: z.number().int().min(0),
});
export type BillingUsage = z.infer<typeof billingUsageSchema>;

export const billingStatusResponseSchema = z.object({
  subscription_tier: z.enum(SUBSCRIPTION_TIERS),
  trial_ends_at: z.string().datetime().nullable(),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  // ISO date the current usage window started (calendar month boundary).
  period_start: z.string().datetime(),
  usage: z.array(billingUsageSchema),
});
export type BillingStatusResponse = z.infer<typeof billingStatusResponseSchema>;
