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

export interface VoiceRow {
  id: string | null;
  name: string;
  share: number;
  isYou: boolean;
}

/**
 * "Who AI recommends" (UX spec 1c): top 8 by share of all agent mentions.
 * Every bar is data-rival except yours (brand, with a Signal Lime dot, on a
 * brand-tint row). Outside the top 8: top 7, a gap, then you.
 */
export function VoiceRanking({
  rows,
  youLabel,
  hrefFor,
  limit = 8,
}: {
  rows: VoiceRow[];
  youLabel: string;
  hrefFor?: (id: string) => string;
  limit?: number;
}) {
  const youIndex = rows.findIndex((r) => r.isYou);
  const shown: (VoiceRow & { rank: number })[] =
    youIndex < limit
      ? rows.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }))
      : [...rows.slice(0, limit - 1).map((r, i) => ({ ...r, rank: i + 1 })), { ...rows[youIndex]!, rank: youIndex + 1 }];
  const top = Math.max(...shown.map((r) => r.share), 1);
  return (
    <ol className="space-y-1">
      {shown.map((r, i) => (
        <li key={`${r.isYou}-${r.id ?? r.name}`}>
          {i > 0 && r.rank - shown[i - 1]!.rank > 1 ? (
            <div className="px-2 py-0.5 text-small text-ink-muted" aria-hidden="true">
              …
            </div>
          ) : null}
          <div
            className={cn(
              "grid grid-cols-[1.5rem_minmax(0,10rem)_1fr_3.25rem] items-center gap-2 rounded-md px-2 py-1.5 text-small sm:gap-3",
              r.isYou && "bg-brand-tint",
            )}
          >
            <span className="font-mono text-data text-ink-muted tabular-nums">{r.rank}</span>
            <span className={cn("flex min-w-0 items-center gap-1.5", r.isYou ? "font-semibold text-ink" : "text-ink-muted")}>
              {r.isYou ? <span className="h-2 w-2 shrink-0 rounded-full bg-signal ring-1 ring-brand/40" aria-hidden="true" /> : null}
              {!r.isYou && r.id && hrefFor ? (
                <a href={hrefFor(r.id)} className="truncate hover:text-ink hover:underline" title={r.name}>
                  {r.name}
                </a>
              ) : (
                <span className="truncate" title={r.isYou ? youLabel : r.name}>
                  {r.isYou ? youLabel : r.name}
                </span>
              )}
            </span>
            <span className="h-2.5 rounded-sm bg-rival-soft">
              <span
                className={cn("block h-full rounded-sm", r.isYou ? "bg-brand" : "bg-rival")}
                style={{ width: `${Math.max(2, (r.share / top) * 100)}%` }}
              />
            </span>
            <span className={cn("text-right font-mono text-data tabular-nums", r.isYou ? "text-ink" : "text-ink-muted")}>
              {r.share < 10 && r.share > 0 ? r.share.toFixed(1) : Math.round(r.share)}%
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
