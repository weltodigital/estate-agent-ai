import Link from "next/link";
import { engineLabel } from "@privett/core";
import { heatStep } from "@/lib/data/answers";
import { cn } from "@/lib/utils";

export interface HeatRow {
  prompt: string;
  active: boolean;
  /** Mention rate per engine id, null when there are no answers for that cell. */
  cells: Record<string, { pct: number | null; answers: number }>;
  overall: number | null;
  /** Change in overall visibility vs the previous period, in points. */
  change: number | null;
}

// One hue: darker Evergreen = named more often. Literal classes for Tailwind.
const STEP_CLASS = [
  "bg-brand/[0.04] text-ink-muted",
  "bg-brand/10 text-ink",
  "bg-brand/25 text-ink",
  "bg-brand/45 text-ink",
  "bg-brand/70 text-on-brand",
  "bg-brand/90 text-on-brand",
] as const;

function Change({ v }: { v: number | null }) {
  if (v === null) return <span className="text-ink-muted">—</span>;
  const r = Math.round(v);
  if (r === 0) return <span className="text-ink-muted">0</span>;
  return (
    <span className={r > 0 ? "text-up" : "text-down"}>
      {r > 0 ? "▲ +" : "▼ −"}
      {Math.abs(r)}
    </span>
  );
}

/** Questions × engines, each cell the % of answers naming you. Click a cell for its answers. */
export function HeatGrid({ rows, engines, cellHref }: { rows: HeatRow[]; engines: string[]; cellHref: (prompt: string, engine: string | null) => string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="rounded-sm px-3 py-2 text-left">Question</th>
            {engines.map((e) => (
              <th key={e} className="w-24 rounded-sm px-2 py-2 text-center">
                {engineLabel(e)}
              </th>
            ))}
            <th className="w-20 rounded-sm px-2 py-2 text-center">All</th>
            <th className="w-20 rounded-sm px-2 py-2 text-right">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.prompt}>
              <td className="max-w-[22rem] px-3 py-1.5">
                <Link href={cellHref(r.prompt, null)} className="block truncate text-ink hover:underline" title={r.prompt}>
                  {r.prompt}
                </Link>
                {!r.active ? <span className="text-small text-ink-muted">No longer tracked</span> : null}
              </td>
              {engines.map((e) => {
                const c = r.cells[e];
                const step = heatStep(c?.pct ?? null);
                if (step === null) {
                  return (
                    <td key={e} className="rounded-sm bg-surface-sunken/60 text-center font-mono text-data text-ink-muted" title="No answers yet">
                      —
                    </td>
                  );
                }
                return (
                  <td key={e} className="p-0">
                    <Link
                      href={cellHref(r.prompt, e)}
                      className={cn("ring-brand-focus block rounded-sm px-2 py-2 text-center font-mono text-data hover:ring-2 hover:ring-brand", STEP_CLASS[step])}
                      title={`${engineLabel(e)}: named you in ${Math.round(c!.pct!)}% of ${c!.answers} answers`}
                    >
                      {Math.round(c!.pct!)}%
                    </Link>
                  </td>
                );
              })}
              <td className="text-center font-mono text-data text-ink">{r.overall === null ? "—" : `${Math.round(r.overall)}%`}</td>
              <td className="pr-2 text-right font-mono text-data">
                <Change v={r.change} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
