"use client";

import { fmtExact, fmtRelative } from "@privett/core";
import { useEffect, useState } from "react";

/** "2 days ago", with the exact time on hover. Re-renders each minute. */
export function RelativeTime({ iso, className }: { iso: string | null | undefined; className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  // Server and first client render agree on the exact date; relative after mount.
  return (
    <time dateTime={iso ?? undefined} title={fmtExact(iso)} className={className} suppressHydrationWarning>
      {now ? fmtRelative(iso, now) : fmtExact(iso)}
    </time>
  );
}
