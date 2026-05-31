import { z } from "zod";
import {
  FLOOR_PLAN_TEMPLATES,
  SUBSCRIPTION_TIERS,
  TONE_OPTIONS,
  WATERMARK_POSITIONS,
} from "../constants.js";

export const agencySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  logo_url: z.string().url().nullable(),
  brand_colour_primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  brand_colour_secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  default_tone: z.enum(TONE_OPTIONS),
  default_watermark_position: z.enum(WATERMARK_POSITIONS),
  floor_plan_template: z.enum(FLOOR_PLAN_TEMPLATES),
  subscription_tier: z.enum(SUBSCRIPTION_TIERS),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  trial_ends_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Agency = z.infer<typeof agencySchema>;

export const updateAgencySchema = agencySchema
  .pick({
    name: true,
    logo_url: true,
    brand_colour_primary: true,
    brand_colour_secondary: true,
    default_tone: true,
    default_watermark_position: true,
    floor_plan_template: true,
  })
  .partial();
export type UpdateAgencyRequest = z.infer<typeof updateAgencySchema>;
