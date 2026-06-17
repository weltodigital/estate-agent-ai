import { FileText, Leaf, Ruler, Sofa, Sparkles, type LucideIcon } from "lucide-react";
import type { PropertyStats } from "@app/shared/schemas";
import { cn } from "@app/ui";

const ITEMS: { key: keyof PropertyStats; singular: string; plural: string; icon: LucideIcon }[] = [
  {
    key: "photo_enhancements",
    singular: "photo enhancement",
    plural: "photo enhancements",
    icon: Sparkles,
  },
  { key: "virtual_stagings", singular: "virtual staging", plural: "virtual stagings", icon: Sofa },
  { key: "ai_descriptions", singular: "AI description", plural: "AI descriptions", icon: FileText },
  { key: "floor_plans", singular: "floor plan", plural: "floor plans", icon: Ruler },
  { key: "epc_details", singular: "EPC", plural: "EPC", icon: Leaf },
];

/**
 * A compact row of asset counts for a property (enhancements, stagings,
 * descriptions, floor plans, EPC). Icons mute to near-invisible when a count is
 * zero so a glance shows what a listing still needs.
 */
export function PropertyStatsBadges({ stats }: { stats?: PropertyStats }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {ITEMS.map(({ key, singular, plural, icon: Icon }) => {
        // Tolerate a missing stats object (e.g. an API that predates this field)
        // so a lagging deploy can't crash the list.
        const count = stats?.[key] ?? 0;
        const present = count > 0;
        return (
          <span
            key={key}
            title={`${count} ${count === 1 ? singular : plural}`}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm",
              present ? "text-[color:var(--brand-primary)]" : "text-brand-slate/40",
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            <span className="font-medium tabular-nums">{count}</span>
          </span>
        );
      })}
    </div>
  );
}
