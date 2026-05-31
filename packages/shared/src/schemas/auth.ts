import { z } from "zod";

export const bootstrapAgencyRequestSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  agency_name: z.string().min(1).max(120),
  branch_postcode: z
    .string()
    .min(5)
    .max(8)
    .regex(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, "Must be a UK postcode"),
});
export type BootstrapAgencyRequest = z.infer<typeof bootstrapAgencyRequestSchema>;

export const bootstrapAgencyResponseSchema = z.object({
  agency_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  user_id: z.string().uuid(),
});
export type BootstrapAgencyResponse = z.infer<typeof bootstrapAgencyResponseSchema>;

export const acceptInviteRequestSchema = z.object({
  token: z.string().min(1),
  full_name: z.string().min(1).max(120),
  password: z.string().min(8).max(128),
});
export type AcceptInviteRequest = z.infer<typeof acceptInviteRequestSchema>;

export const acceptInviteResponseSchema = z.object({
  user_id: z.string().uuid(),
  agency_id: z.string().uuid(),
});
export type AcceptInviteResponse = z.infer<typeof acceptInviteResponseSchema>;
