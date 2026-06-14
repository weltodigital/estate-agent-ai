"use client";

import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@app/ui";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebarNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <a
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-hedge/10 text-brand-hedge"
                : "text-brand-walnut hover:bg-brand-stone/40 hover:text-brand-ink",
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
