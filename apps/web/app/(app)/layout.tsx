import type { ReactNode } from "react";
import { headers } from "next/headers";
import { DemoBanner } from "@/components/app/demo-banner";
import { Sidebar } from "@/components/app/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { requireOrg } from "@/lib/auth";
import { DEMO_HEADER } from "@/lib/demo";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // The public example report: no sign-in, no sidebar, a clear banner.
  if ((await headers()).get(DEMO_HEADER) === "1") {
    return (
      <ToastProvider>
        <div className="min-h-screen">
          <DemoBanner />
          <main className="min-w-0 px-4 py-6 md:px-10 md:py-10">{children}</main>
        </div>
      </ToastProvider>
    );
  }

  const ctx = await requireOrg();
  const supabase = await getSupabaseServerClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, town")
    .eq("org_id", ctx.org.id)
    .is("archived_at", null)
    .order("created_at");
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar ctx={ctx} branches={branches ?? []} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
