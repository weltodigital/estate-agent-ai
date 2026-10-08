import type { ReactNode } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { requireOrg } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await requireOrg();
  const supabase = await getSupabaseServerClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, town")
    .eq("org_id", ctx.org.id)
    .is("archived_at", null)
    .order("created_at");
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar ctx={ctx} branches={branches ?? []} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
