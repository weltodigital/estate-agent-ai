"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Four tabs: the answer, what to do, the evidence behind it, and settings.
const TABS: { href: string; label: string; also?: string[] }[] = [
  { href: "", label: "Overview" },
  { href: "/fixes", label: "Fixes" },
  { href: "/evidence", label: "Evidence", also: ["/prompts", "/competitors", "/citations", "/referrals", "/responses"] },
  { href: "/settings", label: "Settings" },
];

const EVIDENCE: { href: string; label: string; also?: string[] }[] = [
  { href: "/evidence", label: "Numbers" },
  { href: "/prompts", label: "Answers", also: ["/responses"] },
  { href: "/competitors", label: "Competitors" },
  { href: "/citations", label: "Sources" },
  { href: "/referrals", label: "Website visits" },
];

function isActive(pathname: string, base: string, t: { href: string; also?: string[] }) {
  if (t.href === "") return pathname === base;
  return [t.href, ...(t.also ?? [])].some((h) => pathname.startsWith(base + h));
}

export function BranchTabs({ branchId }: { branchId: string }) {
  const pathname = usePathname();
  const base = `/branches/${branchId}`;
  const evidenceOpen = isActive(pathname, base, TABS[2]!);
  return (
    <>
      <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-hairline">
        {TABS.map((t) => {
          const active = isActive(pathname, base, t);
          return (
            <Link
              key={t.href}
              href={base + t.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2 text-sm",
                active ? "border-brand font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {evidenceOpen ? (
        <nav className="-mt-2 mb-6 flex flex-wrap gap-1.5" aria-label="Evidence">
          {EVIDENCE.map((t) => {
            const active = isActive(pathname, base, t);
            return (
              <Link
                key={t.href}
                href={base + t.href}
                className={cn(
                  "ring-brand-focus rounded-full px-3 py-1 text-small",
                  active ? "bg-brand-tint font-medium text-brand" : "text-ink-muted hover:bg-surface-sunken",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </>
  );
}
