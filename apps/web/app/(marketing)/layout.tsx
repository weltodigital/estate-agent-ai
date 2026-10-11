import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteSchema } from "@/components/marketing/site-schema";
import { COPY } from "@/lib/copy";
import { TRADEMARK_NOTE } from "@/components/marketing/assistant-names";

const FOOTER_LINKS: [string, string][] = [
  ["/how-it-works", "How it works"],
  ["/pricing", "Pricing"],
  ["/sample-report", "Sample report"],
  ["/methodology", "Methodology"],
  ["/about", "About"],
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
  ["/bot", "PrivettBot"],
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Marks the page as scripted before it paints, so entrance animations
          can start hidden without hiding anything when JavaScript is off. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      <SiteSchema />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-hairline bg-surface-sunken">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xs">
              <Logo size={24} />
              <p className="mt-3 text-small text-ink-muted">AI search visibility for UK estate and letting agents.</p>
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-1 text-sm sm:grid-cols-4">
              {FOOTER_LINKS.map(([href, label]) => (
                <Link key={href} href={href} className="flex min-h-10 items-center text-ink-muted hover-fine:text-ink">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t border-hairline pt-6 text-small text-ink-muted md:flex-row md:justify-between">
            <p>A Welto Limited company</p>
            <div className="max-w-xl space-y-1 md:text-right">
              <p>{COPY.noPromise}</p>
              <p>{TRADEMARK_NOTE}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
