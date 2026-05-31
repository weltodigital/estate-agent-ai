import { z } from "zod";
import { EPC_RATINGS } from "../constants.js";

export const epcLookupRequestSchema = z.object({
  postcode: z
    .string()
    .min(5)
    .max(8)
    .regex(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, "Must be a UK postcode"),
  address_line_1: z.string().optional(),
});
export type EpcLookupRequest = z.infer<typeof epcLookupRequestSchema>;

export const epcRecordSchema = z.object({
  address: z.string(),
  postcode: z.string(),
  current_rating: z.enum(EPC_RATINGS),
  potential_rating: z.enum(EPC_RATINGS).nullable(),
  expiry_date: z.string().date().nullable(),
  inspection_date: z.string().date().nullable(),
});
export type EpcRecord = z.infer<typeof epcRecordSchema>;

export const epcLookupResponseSchema = z.object({
  results: z.array(epcRecordSchema),
});
export type EpcLookupResponse = z.infer<typeof epcLookupResponseSchema>;
