import { Info } from "lucide-react";
import type { ReactNode } from "react";

/** Accessible hover/focus tooltip, no JS. Used for metric formulas. */
export function InfoTip({ children, label = "How this is calculated" }: { children: ReactNode; label?: string }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={label} className="ring-brand-focus rounded text-ink-muted">
        <Info size={14} strokeWidth={1.5} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-72 -translate-x-1/2 rounded-md border border-hairline bg-surface-raised p-3 text-small leading-relaxed text-ink-muted shadow-pop group-focus-within:block group-hover:block"
      >
        {children}
      </span>
    </span>
  );
}
