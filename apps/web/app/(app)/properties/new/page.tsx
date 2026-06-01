import { redirect } from "next/navigation";
import { PropertyForm } from "@/components/property/property-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "New property — Estate Agent AI" };

type ProfileRow = { branch_id: string | null; agency_id: string };
type BranchRow = { id: string };

export default async function NewPropertyPage() {
  const supabase = getSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");

  // Fetch the user's default branch_id so the form can default to it.
  const { data: profileRaw } = await supabase
    .from("users")
    .select("branch_id, agency_id")
    .eq("id", user.user.id)
    .maybeSingle();
  const profile = profileRaw as ProfileRow | null;

  let branchId = profile?.branch_id ?? null;
  if (!branchId && profile?.agency_id) {
    const { data: branchRaw } = await supabase
      .from("branches")
      .select("id")
      .eq("agency_id", profile.agency_id)
      .limit(1)
      .maybeSingle();
    const branch = branchRaw as BranchRow | null;
    branchId = branch?.id ?? null;
  }
  if (!branchId) redirect("/dashboard");

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">New property</h1>
        <p className="text-sm text-slate-500">Add a listing to your branch.</p>
      </header>
      <PropertyForm mode={{ kind: "create" }} branchId={branchId} />
    </section>
  );
}
