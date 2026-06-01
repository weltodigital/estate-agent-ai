import { z } from "zod";
import { SUBSCRIPTION_TIERS } from "../constants";

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
