"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Quiet sidebar link (UX spec 10): ink-muted by default, active item in brand
 * on brand-tint. Icons inherit the colour.
 */
export function NavLink({ href, children, exact = false }: { href: string; children: ReactNode; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-150",
        active ? "bg-brand-tint font-medium text-brand" : "text-ink-muted hover:bg-surface-raised hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
