"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/prompts", label: "Prompts and answers" },
  { href: "/competitors", label: "Competitors" },
  { href: "/citations", label: "Citations" },
  { href: "/fixes", label: "Fixes" },
  { href: "/referrals", label: "AI referrals" },
  { href: "/settings", label: "Settings" },
];

export function BranchTabs({ branchId }: { branchId: string }) {
  const pathname = usePathname();
  const base = `/branches/${branchId}`;
  return (
    <nav className="-mx-1 mb-8 flex gap-1 overflow-x-auto border-b border-brand-stone">
      {TABS.map((t) => {
        const href = base + t.href;
        const active = t.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={t.href}
            href={href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm",
              active ? "border-brand-hedge font-medium text-brand-ink" : "border-transparent text-brand-walnut hover:text-brand-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
