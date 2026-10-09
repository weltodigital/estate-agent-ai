import Link from "next/link";
import { ENGINE_IDS, engineLabel, INTENT_GROUPS, INTENT_LABELS } from "@privett/core";
import { DAY_PRESETS, filterQuery, type DashFilters } from "@/lib/data/filters";
import { cn } from "@/lib/utils";

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "ring-brand-focus whitespace-nowrap rounded-full border px-3 py-1 text-small font-medium",
        active ? "border-brand bg-brand text-on-brand" : "border-hairline bg-surface-raised text-ink-muted hover:bg-brand-tint",
      )}
    >
      {children}
    </Link>
  );
}

/** Engine, intent and date range filters. Plain links, so it works without JS. */
export function FilterBar({ basePath, filters, extra = {} }: { basePath: string; filters: DashFilters; extra?: Record<string, string | null> }) {
  const q = (o: Record<string, string | null>) => basePath + filterQuery(filters, { ...extra, ...o });
  return (
    <div className="mb-6 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-small text-ink-muted">Engine</span>
        <Pill href={q({ engine: null })} active={!filters.engine}>
          All
        </Pill>
        {ENGINE_IDS.map((e) => (
          <Pill key={e} href={q({ engine: e })} active={filters.engine === e}>
            {engineLabel(e)}
          </Pill>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-small text-ink-muted">Questions</span>
        <Pill href={q({ intent: null })} active={!filters.intent}>
          All
        </Pill>
        {INTENT_GROUPS.map((g) => (
          <Pill key={g} href={q({ intent: g })} active={filters.intent === g}>
            {INTENT_LABELS[g]}
          </Pill>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-small text-ink-muted">Period</span>
        {DAY_PRESETS.map((d) => (
          <Pill key={d} href={q({ days: String(d) })} active={filters.days === d}>
            Last {d} days
          </Pill>
        ))}
      </div>
    </div>
  );
}
