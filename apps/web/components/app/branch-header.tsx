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
  /** e.g. "1 extra scan left this month". */
  scanHint: string | null;
  /** The public example report: no Settings, no Scan now. */
  readOnly?: boolean;
}

// Same header on every branch tab (UX spec 10): where you are on the left,
// Settings and the one primary action, Scan now, on the right.
export function BranchHeader({
  branch,
  branches,
  scanBlockedReason,
  scanHint,
  readOnly = false,
}: BranchHeaderProps) {
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
              className="ring-brand-focus text-title text-ink hover:bg-surface-sunken -ml-1 flex min-h-11 max-w-full items-center gap-1.5 rounded-md px-1 text-left"
            >
              <span className="truncate">{branch.name}</span>
              <ChevronDown
                size={18}
                strokeWidth={1.5}
                className="text-ink-muted shrink-0"
                aria-hidden="true"
              />
            </button>
            {open ? (
              <div
                role="menu"
                className="border-hairline bg-surface-raised shadow-pop absolute left-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-md border p-1"
              >
                {others.map((b) => (
                  <Link
                    key={b.id}
                    role="menuitem"
                    href={`/branches/${b.id}`}
                    onClick={() => setOpen(false)}
                    className="text-ink hover:bg-brand-tint flex min-h-11 items-center justify-between gap-3 rounded-sm px-3 text-sm"
                  >
                    <span className="truncate">{b.name}</span>
                    <span className="text-small text-ink-muted shrink-0">{b.town}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <h1 className="text-title text-ink truncate">{branch.name}</h1>
        )}
      </div>

      {readOnly ? (
        <p className="bg-surface-sunken text-small text-ink-muted self-center rounded-sm px-2 py-1">
          Example data, read only
        </p>
      ) : (
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div className="flex items-center gap-2">
            <Link
              href={`/branches/${branch.id}/settings`}
              className={buttonClasses("ghost", "md", "text-ink-muted min-h-11")}
            >
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
          <p
            className={cn("text-small", state?.error ? "text-down" : "text-ink-muted")}
            role={state?.error ? "alert" : undefined}
          >
            {state?.error ?? state?.ok ?? scanBlockedReason ?? scanHint ?? ""}
          </p>
        </div>
      )}
    </header>
  );
}
