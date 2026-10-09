import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4 md:px-8">
          <Link href="/" aria-label="Privett home">
            <Logo size={24} />
          </Link>
          <nav className="ml-auto flex items-center gap-5 text-sm text-ink-muted">
            <Link href="/#how" className="hidden hover:text-ink sm:inline">How it works</Link>
            <Link href="/pricing" className="hidden hover:text-ink sm:inline">Pricing</Link>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <Link href="/free-scan" className={buttonClasses("primary", "sm")}>Run free scan</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-hairline bg-surface-sunken">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-4 py-10 text-sm md:px-8">
          <Logo size={24} />
          <p className="text-ink-muted">AI search visibility for UK estate and letting agents.</p>
          <nav className="ml-auto flex gap-5 text-ink-muted">
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
