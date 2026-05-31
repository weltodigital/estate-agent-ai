import { z } from "zod";
import { FLOOR_PLAN_STATUSES } from "../constants.js";

export const floorPlanSchema = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  floor_label: z.string().min(1).max(60),
  sketch_url: z.string().url(),
  parsed_json: z.unknown().nullable(),
  editor_state: z.unknown().nullable(),
  status: z.enum(FLOOR_PLAN_STATUSES),
  parse_error: z.string().nullable(),
  output_svg_url: z.string().url().nullable(),
  output_pdf_url: z.string().url().nullable(),
  output_png_url: z.string().url().nullable(),
  total_area_sqm: z.number().nonnegative().nullable(),
  include_furniture: z.boolean(),
  finalised_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type FloorPlan = z.infer<typeof floorPlanSchema>;

export const createFloorPlanRequestSchema = z.object({
  floor_label: z.string().min(1).max(60),
  sketch_upload_id: z.string().uuid(),
  include_furniture: z.boolean().default(false),
});
export type CreateFloorPlanRequest = z.infer<typeof createFloorPlanRequestSchema>;

export const updateFloorPlanRequestSchema = z.object({
  editor_state: z.unknown(),
});
export type UpdateFloorPlanRequest = z.infer<typeof updateFloorPlanRequestSchema>;

export const finaliseFloorPlanRequestSchema = z.object({
  include_furniture: z.boolean().optional(),
});
export type FinaliseFloorPlanRequest = z.infer<typeof finaliseFloorPlanRequestSchema>;

export const floorPlanParsedRoomSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  polygon: z.array(z.tuple([z.number(), z.number()])).min(3),
  area_sqm: z.number().nonnegative().optional(),
});

export const floorPlanParsedOpeningSchema = z.object({
  id: z.string(),
  kind: z.enum(["door", "window"]),
  segment: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
});

export const floorPlanParsedSchema = z.object({
  units: z.enum(["metres", "feet"]),
  scale_metres_per_unit: z.number().positive(),
  rooms: z.array(floorPlanParsedRoomSchema),
  openings: z.array(floorPlanParsedOpeningSchema),
});
export type FloorPlanParsed = z.infer<typeof floorPlanParsedSchema>;
