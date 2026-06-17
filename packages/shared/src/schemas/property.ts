import { z } from "zod";
import {
  EPC_RATINGS,
  LISTING_TYPES,
  PROPERTY_STATUSES,
  TONE_OPTIONS,
  UK_PROPERTY_TYPES,
} from "../constants";

/**
 * Structured, agent-supplied inputs that steer AI description generation
 * (condition, furnishing, council tax band, feature chips per category, and a
 * free-text catch-all). Persisted on the property as JSONB so they're
 * remembered between generations. `features` is keyed by category id
 * (kitchen, bathroom, outside, location, unique, ideal_for, …) and open-ended
 * so the client can add categories without a schema change.
 */
export const descriptionInputsSchema = z.object({
  condition: z.array(z.string().min(1).max(80)).max(30).default([]),
  furnished: z.enum(["furnished", "part_furnished", "unfurnished"]).nullable().default(null),
  council_tax_band: z.string().max(2).nullable().default(null),
  features: z.record(z.string(), z.array(z.string().min(1).max(80)).max(40)).default({}),
  other_details: z.string().max(3000).default(""),
});
export type DescriptionInputs = z.infer<typeof descriptionInputsSchema>;

export const propertySchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  created_by: z.string().uuid(),
  address_line_1: z.string().min(1).max(200),
  address_line_2: z.string().max(200).nullable(),
  town: z.string().min(1).max(120),
  postcode: z.string().min(5).max(8),
  property_type: z.enum(UK_PROPERTY_TYPES),
  listing_type: z.enum(LISTING_TYPES),
  bedrooms: z.number().int().min(0).max(99),
  bathrooms: z.number().int().min(0).max(99),
  price_pence: z.number().int().min(0),
  status: z.enum(PROPERTY_STATUSES),
  description: z.string().nullable(),
  description_tone: z.enum(TONE_OPTIONS).nullable(),
  epc_current_rating: z.enum(EPC_RATINGS).nullable(),
  epc_potential_rating: z.enum(EPC_RATINGS).nullable(),
  epc_expiry_date: z.string().date().nullable(),
  notes: z.string().nullable(),
  // Optional (not just nullable) so reads survive the gap before the
  // description_inputs column migration is applied — the field is simply absent
  // then rather than null.
  description_inputs: descriptionInputsSchema.nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});
export type Property = z.infer<typeof propertySchema>;

export const createPropertySchema = propertySchema
  .pick({
    branch_id: true,
    address_line_1: true,
    address_line_2: true,
    town: true,
    postcode: true,
    property_type: true,
    listing_type: true,
    bedrooms: true,
    bathrooms: true,
    price_pence: true,
    notes: true,
  })
  // Creation captures only address, price and sale/let. Property type, bedrooms
  // and bathrooms are optional here — enriched later via the edit form or the
  // AI-description step — and the API fills sensible defaults on insert.
  .partial({
    address_line_2: true,
    notes: true,
    property_type: true,
    bedrooms: true,
    bathrooms: true,
  });
export type CreatePropertyRequest = z.infer<typeof createPropertySchema>;

export const updatePropertySchema = createPropertySchema
  .extend({
    status: z.enum(PROPERTY_STATUSES),
    description: z.string().nullable(),
    description_tone: z.enum(TONE_OPTIONS).nullable(),
    description_inputs: descriptionInputsSchema.nullable(),
    epc_current_rating: z.enum(EPC_RATINGS).nullable(),
    epc_potential_rating: z.enum(EPC_RATINGS).nullable(),
    epc_expiry_date: z.string().date().nullable(),
  })
  .partial();
export type UpdatePropertyRequest = z.infer<typeof updatePropertySchema>;

export const generateDescriptionRequestSchema = z.object({
  tone: z.enum(TONE_OPTIONS),
  // Structured details the agent wants reflected in the description.
  inputs: descriptionInputsSchema.optional(),
  highlights: z.array(z.string()).max(20).optional(),
});
export type GenerateDescriptionRequest = z.infer<typeof generateDescriptionRequestSchema>;

export const propertyListQuerySchema = z.object({
  status: z.enum(PROPERTY_STATUSES).optional(),
  branch_id: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;

/**
 * Per-property counts of the AI assets produced for it, shown as icons on the
 * property list and dashboard. descriptions/EPC are 0-or-1 (a property has at
 * most one of each); the rest are true counts.
 */
export const propertyStatsSchema = z.object({
  photo_enhancements: z.number().int().min(0),
  virtual_stagings: z.number().int().min(0),
  ai_descriptions: z.number().int().min(0),
  floor_plans: z.number().int().min(0),
  epc_details: z.number().int().min(0),
});
export type PropertyStats = z.infer<typeof propertyStatsSchema>;

export const propertyListItemSchema = propertySchema.extend({
  stats: propertyStatsSchema,
});
export type PropertyListItem = z.infer<typeof propertyListItemSchema>;

export const propertyListResponseSchema = z.object({
  items: z.array(propertyListItemSchema),
  total: z.number().int().min(0),
});
export type PropertyListResponse = z.infer<typeof propertyListResponseSchema>;
