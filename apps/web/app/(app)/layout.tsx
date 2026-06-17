import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { AppProviders } from "@/components/providers";
import { Protected } from "@/components/protected";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppSidebarNav } from "@/components/app-sidebar-nav";
import { Wordmark } from "@/components/brand/wordmark";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The signed-in agent's display name + email for the sidebar footer. Falls
  // back to the auth email if the profile row can't be read; Protected handles
  // the no-user case by redirecting, so this only renders for real sessions.
  let displayName: string | null = null;
  let email: string | null = user?.email ?? null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle<{ full_name: string; email: string }>();
    if (profile) {
      displayName = profile.full_name;
      email = profile.email;
    }
  }

  return (
    <Protected>
      <AppProviders>
        <div className="flex min-h-screen">
          <aside className="border-brand-stone bg-brand-bone flex w-60 flex-col justify-between border-r px-3 py-6">
            <div>
              <a href="/dashboard" className="mb-8 block px-3">
                <Wordmark size={22} />
              </a>
              <AppSidebarNav />
            </div>
            <div className="space-y-3">
              <a
                href="/contact"
                className="text-brand-walnut hover:bg-brand-stone/30 hover:text-brand-ink flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                <HelpCircle className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
                <span>Help</span>
              </a>
              <div className="border-brand-stone space-y-2 border-t pt-3">
                <div className="px-3">
                  <p className="text-brand-slate text-xs">Logged in as</p>
                  <p className="text-brand-ink truncate text-sm font-medium">
                    {displayName ?? email ?? "Your account"}
                  </p>
                  {displayName && email ? (
                    <p className="text-brand-slate truncate text-xs">{email}</p>
                  ) : null}
                </div>
                <SignOutButton />
              </div>
            </div>
          </aside>
          <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-10">{children}</main>
        </div>
      </AppProviders>
    </Protected>
  );
}
