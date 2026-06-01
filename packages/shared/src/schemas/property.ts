import { z } from "zod";
import {
  EPC_RATINGS,
  LISTING_TYPES,
  PROPERTY_STATUSES,
  TONE_OPTIONS,
  UK_PROPERTY_TYPES,
} from "../constants";

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
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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
  .partial({ address_line_2: true, notes: true });
export type CreatePropertyRequest = z.infer<typeof createPropertySchema>;

export const updatePropertySchema = createPropertySchema
  .extend({
    status: z.enum(PROPERTY_STATUSES),
    description: z.string().nullable(),
    description_tone: z.enum(TONE_OPTIONS).nullable(),
  })
  .partial();
export type UpdatePropertyRequest = z.infer<typeof updatePropertySchema>;

export const generateDescriptionRequestSchema = z.object({
  tone: z.enum(TONE_OPTIONS),
  highlights: z.array(z.string()).max(20).optional(),
});
export type GenerateDescriptionRequest = z.infer<typeof generateDescriptionRequestSchema>;
