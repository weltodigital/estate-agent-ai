import { redirect } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Lands on the first branch, or asks for one.
export default async function DashboardPage() {
  const ctx = await requireOrg();
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("branches")
    .select("id")
    .eq("org_id", ctx.org.id)
    .is("archived_at", null)
    .order("created_at")
    .limit(1);
  redirect(data?.[0] ? `/branches/${data[0].id}` : "/branches/new");
}
