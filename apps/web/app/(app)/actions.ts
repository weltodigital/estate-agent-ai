"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORG_COOKIE } from "@/lib/auth";

export async function switchOrganisation(formData: FormData) {
  const orgId = String(formData.get("org_id") ?? "");
  // Membership is re-checked by requireOrg(); an invalid id falls back to the first org.
  (await cookies()).set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/dashboard");
}
