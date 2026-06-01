import { z } from "zod";
import { FLOOR_PLAN_STATUSES } from "../constants";

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

// Web -> API. The browser sends filename + content_type so the API can
// generate a signed R2 PUT, and a floor_label so the row is identifiable.
export const createFloorPlanRequestSchema = z.object({
  floor_label: z.string().min(1).max(60),
  filename: z.string().min(1).max(200),
  content_type: z.string().regex(/^image\//),
  include_furniture: z.boolean().default(false),
});
export type CreateFloorPlanRequest = z.infer<typeof createFloorPlanRequestSchema>;

export const createFloorPlanResponseSchema = z.object({
  floor_plan: floorPlanSchema,
  upload_url: z.string().url(),
});
export type CreateFloorPlanResponse = z.infer<typeof createFloorPlanResponseSchema>;

export const parseFloorPlanResponseSchema = z.object({
  floor_plan_id: z.string().uuid(),
  job_id: z.string(),
  status: z.literal("parsing"),
});
export type ParseFloorPlanResponse = z.infer<typeof parseFloorPlanResponseSchema>;

export const floorPlansListResponseSchema = z.object({
  items: z.array(floorPlanSchema),
});
export type FloorPlansListResponse = z.infer<typeof floorPlansListResponseSchema>;

export const updateFloorPlanRequestSchema = z.object({
  editor_state: z.unknown(),
});
export type UpdateFloorPlanRequest = z.infer<typeof updateFloorPlanRequestSchema>;

export const finaliseFloorPlanRequestSchema = z.object({
  include_furniture: z.boolean().optional(),
});
export type FinaliseFloorPlanRequest = z.infer<typeof finaliseFloorPlanRequestSchema>;

// ---------------------------------------------------------------------------
// Parsed floor plan JSON — mirrors the orchestrator's Pydantic schema.
// ---------------------------------------------------------------------------
export const floorPlanParsedRoomSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  polygon: z.array(z.tuple([z.number(), z.number()])).min(3),
  area_sqm: z.number().nonnegative().optional(),
});
export type FloorPlanParsedRoom = z.infer<typeof floorPlanParsedRoomSchema>;

export const floorPlanParsedOpeningSchema = z.object({
  id: z.string(),
  kind: z.enum(["door", "window"]),
  segment: z.tuple([z.tuple([z.number(), z.number()]), z.tuple([z.number(), z.number()])]),
});
export type FloorPlanParsedOpening = z.infer<typeof floorPlanParsedOpeningSchema>;

export const floorPlanParsedSchema = z.object({
  units: z.enum(["metres", "feet"]),
  scale_metres_per_unit: z.number().positive(),
  rooms: z.array(floorPlanParsedRoomSchema),
  openings: z.array(floorPlanParsedOpeningSchema),
});
export type FloorPlanParsed = z.infer<typeof floorPlanParsedSchema>;

// ---------------------------------------------------------------------------
// Orchestrator -> API callback after parsing completes (success or failure).
// HMAC-signed in the same scheme as the photo callbacks.
// ---------------------------------------------------------------------------
export const floorPlanParsedCallbackSchema = z
  .object({
    floor_plan_id: z.string().uuid(),
    agency_id: z.string().uuid(),
    status: z.enum(["parsed", "failed"]),
    parsed_json: floorPlanParsedSchema.nullable().optional(),
    output_svg_url: z.string().url().nullable().optional(),
    total_area_sqm: z.number().nonnegative().nullable().optional(),
    parse_error: z.string().nullable().optional(),
  })
  .refine(
    (v) => v.status === "failed" || (v.parsed_json && v.output_svg_url),
    "parsed status requires parsed_json + output_svg_url",
  );
export type FloorPlanParsedCallback = z.infer<typeof floorPlanParsedCallbackSchema>;
