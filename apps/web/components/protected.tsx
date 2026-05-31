import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function Protected({ children }: { children: ReactNode }) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/login");
  }
  return <>{children}</>;
}
