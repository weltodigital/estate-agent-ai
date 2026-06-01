import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers";
import { Protected } from "@/components/protected";
import { SignOutButton } from "@/components/auth/sign-out-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Protected>
      <AppProviders>
        <div className="flex min-h-screen">
          <aside className="flex w-60 flex-col justify-between border-r border-slate-200 bg-white px-4 py-6">
            <div>
              <a href="/dashboard" className="mb-8 block px-2 text-sm font-semibold">
                Estate Agent AI
              </a>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
            <SignOutButton />
          </aside>
          <main className="flex-1 px-8 py-8">{children}</main>
        </div>
      </AppProviders>
    </Protected>
  );
}
