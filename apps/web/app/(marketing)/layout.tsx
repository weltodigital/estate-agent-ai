import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="font-semibold">
            Estate Agent AI
          </a>
          <nav className="flex gap-4 text-sm">
            <a href="/pricing">Pricing</a>
            <a href="/login">Log in</a>
            <a
              href="/signup"
              className="rounded-md bg-[color:var(--brand-primary)] px-3 py-1.5 text-white"
            >
              Get started
            </a>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-16">{children}</div>
    </main>
  );
}
