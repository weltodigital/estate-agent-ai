import { z } from "zod";
import { USER_ROLES } from "../constants";

// UK postcode shared validator.
const ukPostcode = z
  .string()
  .min(5)
  .max(8)
  .regex(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, "Must be a UK postcode");

// ---------------------------------------------------------------------------
// Signup form (browser captures all five; only three go to the API — the
// email + password are used to call Supabase Auth `signUp` directly).
// ---------------------------------------------------------------------------
export const signupFormSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  agency_name: z.string().min(1).max(120),
  branch_postcode: ukPostcode,
});
export type SignupFormValues = z.infer<typeof signupFormSchema>;

// ---------------------------------------------------------------------------
// POST /v1/auth/bootstrap-agency  — called after Supabase Auth signUp succeeds.
// ---------------------------------------------------------------------------
export const bootstrapAgencyRequestSchema = z.object({
  full_name: z.string().min(1).max(120),
  agency_name: z.string().min(1).max(120),
  branch_postcode: ukPostcode,
});
export type BootstrapAgencyRequest = z.infer<typeof bootstrapAgencyRequestSchema>;

export const bootstrapAgencyResponseSchema = z.object({
  agency_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  user_id: z.string().uuid(),
});
export type BootstrapAgencyResponse = z.infer<typeof bootstrapAgencyResponseSchema>;

// ---------------------------------------------------------------------------
// Login form.
// ---------------------------------------------------------------------------
export const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const magicLinkFormSchema = z.object({
  email: z.string().email(),
});
export type MagicLinkFormValues = z.infer<typeof magicLinkFormSchema>;

// ---------------------------------------------------------------------------
// Invites.
// ---------------------------------------------------------------------------
export const createInviteRequestSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(120).optional(),
  role: z.enum(USER_ROLES).default("agent"),
  branch_id: z.string().uuid().nullable().optional(),
});
export type CreateInviteRequest = z.infer<typeof createInviteRequestSchema>;

export const inviteSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  branch_id: z.string().uuid().nullable(),
  email: z.string().email(),
  full_name: z.string().nullable(),
  role: z.enum(USER_ROLES),
  token: z.string(),
  invited_by: z.string().uuid(),
  expires_at: z.string().datetime(),
  accepted_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type Invite = z.infer<typeof inviteSchema>;

export const createInviteResponseSchema = z.object({
  invite: inviteSchema,
  invite_url: z.string().url(),
});
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>;

// Accept-invite form (signup form for invited users).
export const acceptInviteFormSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(1).max(120),
});
export type AcceptInviteFormValues = z.infer<typeof acceptInviteFormSchema>;

// POST /v1/auth/accept-invite — called after Supabase Auth signUp.
export const acceptInviteRequestSchema = z.object({
  token: z.string().min(1),
  full_name: z.string().min(1).max(120),
});
export type AcceptInviteRequest = z.infer<typeof acceptInviteRequestSchema>;

export const acceptInviteResponseSchema = z.object({
  user_id: z.string().uuid(),
  agency_id: z.string().uuid(),
});
export type AcceptInviteResponse = z.infer<typeof acceptInviteResponseSchema>;
