import { redirect } from "next/navigation";
import { FinishSetupForm } from "@/components/auth/finish-setup-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Finish setup" };

/**
 * Server-side guard: only shown when the caller has an auth session but no
 * public.users row. If they have neither (not signed in) we bounce to /login;
 * if they have both (already bootstrapped) we bounce to /dashboard so they
 * don't accidentally double-bootstrap.
 */
export default async function FinishSetupPage() {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile) redirect("/dashboard");

  return (
    <section className="border-brand-stone bg-brand-cream space-y-4 rounded-lg border p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Finish setting up your agency</h1>
        <p className="text-brand-slate text-sm">
          We just need a couple more details to create your agency and branch.
        </p>
      </header>
      <FinishSetupForm />
    </section>
  );
}
