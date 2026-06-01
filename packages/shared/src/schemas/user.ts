import { z } from "zod";
import { USER_ROLES } from "../constants";

export const userSchema = z.object({
  id: z.string().uuid(),
  agency_id: z.string().uuid(),
  branch_id: z.string().uuid().nullable(),
  email: z.string().email(),
  full_name: z.string().min(1).max(120),
  role: z.enum(USER_ROLES),
  avatar_url: z.string().url().nullable(),
  invited_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;

export const inviteUserRequestSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(120),
  role: z.enum(USER_ROLES),
  branch_id: z.string().uuid().nullable(),
});
export type InviteUserRequest = z.infer<typeof inviteUserRequestSchema>;

export const usersListResponseSchema = z.object({
  items: z.array(userSchema),
});
export type UsersListResponse = z.infer<typeof usersListResponseSchema>;

export const updateUserRequestSchema = z.object({
  role: z.enum(USER_ROLES).optional(),
  branch_id: z.string().uuid().nullable().optional(),
});
export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;
