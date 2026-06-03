import { notFound } from "next/navigation";
import type { Property } from "@app/shared/schemas";
import { PropertyForm } from "@/components/property/property-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit property" };

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error || !data) notFound();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Edit property</h1>
        <p className="text-sm text-slate-500">{(data as Property).address_line_1}</p>
      </header>
      <PropertyForm
        mode={{ kind: "edit", property: data as Property }}
        branchId={(data as Property).branch_id}
      />
    </section>
  );
}
