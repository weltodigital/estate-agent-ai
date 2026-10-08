import { Info } from "lucide-react";
import type { ReactNode } from "react";

/** Accessible hover/focus tooltip, no JS. Used for metric formulas. */
export function InfoTip({ children, label = "How this is calculated" }: { children: ReactNode; label?: string }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={label} className="ring-brand-focus rounded text-brand-slate">
        <Info size={14} strokeWidth={1.5} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-72 -translate-x-1/2 rounded-md border border-brand-stone bg-white p-3 text-xs leading-relaxed text-brand-walnut shadow-card-hover group-focus-within:block group-hover:block"
      >
        {children}
      </span>
    </span>
  );
}
