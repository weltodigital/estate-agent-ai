import type { RunOutcome } from "@/lib/data/answers";
import { cn } from "@/lib/utils";

/** "Named in 2 of 3 runs" with one dot per run, so the variation is visible. */
export function RunStrip({ runs, current }: { runs: RunOutcome[]; current?: number }) {
  if (runs.length < 2) return null;
  const read = runs.filter((r) => r.named !== null);
  const named = read.filter((r) => r.named).length;
  return (
    <span className="inline-flex items-center gap-2 text-small text-ink-muted">
      <span className="inline-flex gap-1" aria-hidden="true">
        {runs.map((r) => (
          <span
            key={r.runIndex}
            className={cn(
              "h-2 w-2 rounded-full",
              r.named === true ? "bg-brand" : r.named === false ? "bg-rival-soft" : "ring-1 ring-inset ring-hairline",
              current === r.runIndex && "ring-2 ring-signal ring-offset-1 ring-offset-surface-raised",
            )}
          />
        ))}
      </span>
      <span>
        Named in <span className="font-mono text-ink">{named}</span> of <span className="font-mono text-ink">{read.length}</span> run
        {read.length === 1 ? "" : "s"}
        {read.length < runs.length ? ` (${runs.length - read.length} not read)` : ""}
      </span>
    </span>
  );
}
