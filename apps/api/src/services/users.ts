import type { FastifyRequest } from "fastify";
import type { UpdateUserRequest, User } from "@app/shared/schemas";
import { AppError, badRequest, notFound, unauthorised } from "../errors.js";
import { getUserClient } from "../integrations/supabase.js";

export async function listAgencyUsers(request: FastifyRequest): Promise<User[]> {
  if (!request.user || !request.agencyId) throw unauthorised();
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    throw new AppError({
      status: 500,
      code: "list_users_failed",
      message: "Could not load team members.",
    });
  }
  return (data ?? []) as User[];
}

export async function updateUser(
  request: FastifyRequest,
  id: string,
  payload: UpdateUserRequest,
): Promise<User> {
  if (!request.user || !request.agencyId) throw unauthorised();
  if (request.user.id === id) {
    throw badRequest("You can't change your own role or branch via this endpoint.");
  }
  const supabase = getUserClient(request.user.accessToken);
  const { data, error } = await supabase
    .from("users")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle<User>();
  if (error) {
    if (error.code === "42501") {
      throw new AppError({
        status: 403,
        code: "admin_only",
        message: "Only an admin can change team members.",
      });
    }
    throw new AppError({
      status: 500,
      code: "update_user_failed",
      message: "Could not update team member.",
    });
  }
  if (!data) throw notFound("User");
  return data;
}

export async function removeUser(request: FastifyRequest, id: string): Promise<void> {
  if (!request.user || !request.agencyId) throw unauthorised();
  if (request.user.id === id) {
    throw badRequest("You can't remove yourself from the team.");
  }
  const supabase = getUserClient(request.user.accessToken);
  const { error, count } = await supabase.from("users").delete({ count: "exact" }).eq("id", id);
  if (error) {
    if (error.code === "42501") {
      throw new AppError({
        status: 403,
        code: "admin_only",
        message: "Only an admin can remove team members.",
      });
    }
    throw new AppError({
      status: 500,
      code: "remove_user_failed",
      message: "Could not remove team member.",
    });
  }
  if ((count ?? 0) === 0) throw notFound("User");
}
