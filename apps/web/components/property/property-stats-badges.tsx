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
export function PropertyStatsBadges({ stats }: { stats: PropertyStats }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {ITEMS.map(({ key, singular, plural, icon: Icon }) => {
        const count = stats[key];
        const present = count > 0;
        return (
          <span
            key={key}
            title={`${count} ${count === 1 ? singular : plural}`}
            className={cn(
              "inline-flex items-center gap-1 text-xs",
              present ? "text-brand-walnut" : "text-brand-slate/40",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            <span className="tabular-nums">{count}</span>
          </span>
        );
      })}
    </div>
  );
}
