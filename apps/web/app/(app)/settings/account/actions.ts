"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/platform/action-form";
import { deleteAccount, deleteOrganisation } from "@/lib/account";
import { ORG_COOKIE, requireOrg } from "@/lib/auth";
import { COPY } from "@/lib/copy";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const same = (a: FormDataEntryValue | null, b: string) => String(a ?? "").trim().toLowerCase() === b.trim().toLowerCase();

export async function deleteOrganisationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (ctx.role !== "owner") return { error: "Only an owner can delete the organisation." };
  if (!same(formData.get("confirm"), ctx.org.name)) return { error: `Type ${ctx.org.name} to confirm.` };
  try {
    await deleteOrganisation(ctx.org.id);
  } catch (err) {
    console.error("delete organisation", ctx.org.id, err);
    return { error: COPY.genericError };
  }
  (await cookies()).delete(ORG_COOKIE);
  // Another organisation if they have one, otherwise onboarding.
  redirect("/dashboard");
}

export async function deleteAccountAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireOrg();
  if (!same(formData.get("confirm"), ctx.user.email)) return { error: "Type your email address to confirm." };
  try {
    const result = await deleteAccount(ctx.user);
    if (result.error) return { error: result.error };
  } catch (err) {
    console.error("delete account", ctx.user.id, err);
    return { error: COPY.genericError };
  }
  // The user no longer exists; clear the session cookies too.
  await (await getSupabaseServerClient()).auth.signOut().catch(() => undefined);
  (await cookies()).delete(ORG_COOKIE);
  redirect("/login?deleted=1");
}
