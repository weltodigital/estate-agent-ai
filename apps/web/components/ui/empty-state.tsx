import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The canonical empty state: a soft icon, a serif title, one helpful line, and
 * the single most useful action. Never dead text like "No items." See the
 * design pass / BRANDING.md.
 */
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <Icon className="text-brand-slate h-10 w-10" strokeWidth={1.5} aria-hidden />
      <h3
        className="text-brand-ink mt-4 font-serif text-xl font-medium"
        style={{ fontVariationSettings: '"opsz" 24' }}
      >
        {title}
      </h3>
      {subtitle ? <p className="text-brand-walnut mt-2 max-w-xs text-sm">{subtitle}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
