"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { agencyApi } from "@/lib/queries";

/**
 * Reads the caller's agency on mount and writes its brand colours onto
 * document.documentElement as CSS custom properties. Components reference
 * those via `bg-[color:var(--brand-primary)]` etc., so theming is per-agency
 * without rebuilding Tailwind.
 */
export function BrandColours() {
  const { data } = useQuery({
    queryKey: ["agency", "me"],
    queryFn: agencyApi.me,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    if (data.brand_colour_primary) {
      root.style.setProperty("--brand-primary", data.brand_colour_primary);
    }
    if (data.brand_colour_secondary) {
      root.style.setProperty("--brand-secondary", data.brand_colour_secondary);
    }
    return () => {
      // We don't tear down the colours — switching agencies (future) will
      // overwrite them. If we ever go multi-tenant on the same session, this
      // needs to clean up.
    };
  }, [data]);

  return null;
}
