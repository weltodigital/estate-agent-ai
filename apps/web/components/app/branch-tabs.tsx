"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Four tabs (UX spec 1): the answer, the answers behind it, who else AI
// names, and what to do. Settings lives in the branch header.
const TABS: { href: string; label: string; also?: string[] }[] = [
  { href: "", label: "Overview", also: ["/referrals"] },
  { href: "/prompts", label: "Answers", also: ["/responses"] },
  { href: "/competitors", label: "Competitors" },
  { href: "/fixes", label: "Fixes", also: ["/citations"] },
];

function isActive(pathname: string, base: string, t: { href: string; also?: string[] }) {
  if (t.href === "" && pathname === base) return true;
  return [t.href, ...(t.also ?? [])].filter(Boolean).some((h) => pathname.startsWith(base + h));
}

export function BranchTabs({ branchId }: { branchId: string }) {
  const pathname = usePathname();
  const base = `/branches/${branchId}`;
  return (
    <nav className="-mx-1 mb-8 flex gap-1 overflow-x-auto border-b border-hairline" aria-label="Branch">
      {TABS.map((t) => {
        const active = isActive(pathname, base, t);
        return (
          <Link
            key={t.label}
            href={base + t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm transition-colors duration-150",
              active ? "border-brand font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
