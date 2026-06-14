import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers";
import { Protected } from "@/components/protected";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AppSidebarNav } from "@/components/app-sidebar-nav";
import { Wordmark } from "@/components/brand/wordmark";

export default function AppLayout({ children }: { children: ReactNode }) {
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
            <SignOutButton />
          </aside>
          <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-10">{children}</main>
        </div>
      </AppProviders>
    </Protected>
  );
}
