import { cn } from "@/lib/utils";

/**
 * "Who AI names most": you in brand green, everyone else grey (the data
 * colour rule in BRANDING.md). Values are % of answers naming each agent.
 */
export function RankingBars({ rows, youLabel = "You" }: { rows: { name: string; visibility: number; isYou: boolean }[]; youLabel?: string }) {
  const top = Math.max(...rows.map((r) => r.visibility), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={`${r.isYou}-${r.name}`} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3 text-small">
          <span className={cn("truncate", r.isYou ? "font-semibold text-ink" : "text-ink-muted")}>{r.isYou ? youLabel : r.name}</span>
          <span className="h-2.5 rounded-sm bg-rival-soft">
            <span
              className={cn("block h-full rounded-sm", r.isYou ? "bg-brand" : "bg-rival")}
              style={{ width: `${Math.max(2, (r.visibility / top) * 100)}%` }}
            />
          </span>
          <span className={cn("text-right font-mono text-data", r.isYou ? "text-ink" : "text-ink-muted")}>{Math.round(r.visibility)}%</span>
        </li>
      ))}
    </ul>
  );
}
