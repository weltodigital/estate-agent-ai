"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { scanNow, type ScanNowState } from "@/app/(app)/branches/[branchId]/header-actions";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BranchHeaderProps {
  branch: { id: string; name: string; town: string };
  /** Other branches in the organisation, for the switcher. */
  branches: { id: string; name: string; town: string }[];
  /** Why Scan now is unavailable, or null if it can run. */
  scanBlockedReason: string | null;
  /** e.g. "1 extra scan left this week". */
  scanHint: string | null;
}

// Same header on every branch tab (UX spec 10): where you are on the left,
// Settings and the one primary action, Scan now, on the right.
export function BranchHeader({ branch, branches, scanBlockedReason, scanHint }: BranchHeaderProps) {
  const [state, action, pending] = useActionState<ScanNowState, FormData>(scanNow, null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const others = branches.filter((b) => b.id !== branch.id);
  const blocked = !!scanBlockedReason;

  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0" ref={menuRef}>
        <p className="text-small text-ink-muted">{branch.town}</p>
        {others.length ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-haspopup="menu"
              className="ring-brand-focus -ml-1 flex min-h-11 max-w-full items-center gap-1.5 rounded-md px-1 text-left text-title text-ink hover:bg-surface-sunken"
            >
              <span className="truncate">{branch.name}</span>
              <ChevronDown size={18} strokeWidth={1.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
            </button>
            {open ? (
              <div role="menu" className="absolute left-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-hairline bg-surface-raised p-1 shadow-pop">
                {others.map((b) => (
                  <Link
                    key={b.id}
                    role="menuitem"
                    href={`/branches/${b.id}`}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-sm px-3 text-sm text-ink hover:bg-brand-tint"
                  >
                    <span className="truncate">{b.name}</span>
                    <span className="shrink-0 text-small text-ink-muted">{b.town}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <h1 className="truncate text-title text-ink">{branch.name}</h1>
        )}
      </div>

      <div className="flex flex-col items-start gap-1 sm:items-end">
        <div className="flex items-center gap-2">
          <Link href={`/branches/${branch.id}/settings`} className={buttonClasses("ghost", "md", "min-h-11 text-ink-muted")}>
            <Settings size={16} strokeWidth={1.5} aria-hidden="true" />
            Settings
          </Link>
          <form action={action}>
            <input type="hidden" name="branch_id" value={branch.id} />
            <button
              type="submit"
              disabled={blocked || pending}
              title={scanBlockedReason ?? undefined}
              className={cn(buttonClasses("primary", "md", "min-h-11"), "active:scale-[0.97]")}
            >
              {pending ? "Starting…" : "Scan now"}
            </button>
          </form>
        </div>
        <p className={cn("text-small", state?.error ? "text-down" : "text-ink-muted")} role={state?.error ? "alert" : undefined}>
          {state?.error ?? state?.ok ?? scanBlockedReason ?? scanHint ?? ""}
        </p>
      </div>
    </header>
  );
}
