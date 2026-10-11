"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Sticky header. The hairline appears only once the page has scrolled, so the
// hero sits on one uninterrupted surface. "Run free scan" is the only button.
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85 transition-colors duration-150",
        scrolled ? "border-hairline" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-8">
        <Link href="/" aria-label="Privett home" className="ring-brand-focus rounded-md">
          <Logo size={24} />
        </Link>

        <nav className="ml-auto hidden items-center gap-6 text-sm text-ink-muted md:flex" aria-label="Main">
          <Link href="/how-it-works" className="hover-fine:text-ink">How it works</Link>
          <Link href="/pricing" className="hover-fine:text-ink">Pricing</Link>
          <ThemeToggle />
          <Link href="/login" className="hover-fine:text-ink">Sign in</Link>
          <Link href="/free-scan" className={buttonClasses("primary", "sm")}>Run free scan</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <Link href="/free-scan" className={buttonClasses("primary", "sm", "h-10")}>Free scan</Link>
          <details className="group relative">
            <summary className="ring-brand-focus flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-md text-ink" aria-label="Menu">
              <Menu size={20} strokeWidth={1.5} className="group-open:hidden" aria-hidden="true" />
              <X size={20} strokeWidth={1.5} className="hidden group-open:block" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-14 w-56 rounded-lg border border-hairline bg-surface-raised p-2 shadow-pop">
              {[
                ["/how-it-works", "How it works"],
                ["/pricing", "Pricing"],
                ["/sample-report", "Sample report"],
                ["/login", "Sign in"],
              ].map(([href, label]) => (
                <Link key={href} href={href!} className="flex min-h-12 items-center rounded-md px-3 text-ink hover-fine:bg-surface-sunken">
                  {label}
                </Link>
              ))}
              <div className="flex min-h-12 items-center justify-between px-3 text-small text-ink-muted">
                Theme <ThemeToggle />
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
