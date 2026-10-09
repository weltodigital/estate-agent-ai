import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { buttonClasses } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-brand-stone">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4 md:px-8">
          <Link href="/" aria-label="Privett home">
            <Wordmark size={24} />
          </Link>
          <nav className="ml-auto flex items-center gap-5 text-sm text-brand-walnut">
            <Link href="/#how" className="hidden hover:text-brand-ink sm:inline">How it works</Link>
            <Link href="/pricing" className="hidden hover:text-brand-ink sm:inline">Pricing</Link>
            <Link href="/login" className="hover:text-brand-ink">Sign in</Link>
            <Link href="/free-scan" className={buttonClasses("accent", "sm")}>Free scan</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-brand-hedge text-brand-bone">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-4 py-10 text-sm md:px-8">
          <Wordmark size={24} variant="bone" />
          <p className="text-brand-sand">AI search visibility for UK estate and letting agents.</p>
          <nav className="ml-auto flex gap-5 text-brand-sand">
            <Link href="/pricing" className="hover:text-brand-bone">Pricing</Link>
            <Link href="/privacy" className="hover:text-brand-bone">Privacy</Link>
            <Link href="/terms" className="hover:text-brand-bone">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
