import { Info } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A quiet, on-brand reminder that AI output needs a human check. Understated by
 * design (see BRANDING.md) — informative, not alarmist. Copy lives in lib/copy.
 */
export function AiNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="border-brand-stone bg-brand-cream text-brand-walnut flex items-start gap-2.5 rounded-md border px-3 py-2 text-xs"
    >
      <Info className="text-brand-slate mt-px h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <p>{children}</p>
    </div>
  );
}
