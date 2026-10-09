import { engineLabel } from "@privett/core";
import { Badge } from "@/components/ui/badge";
import type { ScanRunRow } from "@/lib/data/branch-data";
import { formatDateTime } from "@/lib/utils";

const STATUS: Record<ScanRunRow["status"], { label: string; tone: "neutral" | "good" | "bad" | "warn" | "brand" }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Running", tone: "brand" },
  completed: { label: "Completed", tone: "good" },
  failed: { label: "Failed", tone: "bad" },
  budget_exceeded: { label: "Stopped at cost cap", tone: "warn" },
};

export function ScanProgress({ run }: { run: ScanRunRow }) {
  const done = run.progress?.done ?? 0;
  const total = run.progress?.total ?? 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={STATUS[run.status].tone}>{STATUS[run.status].label}</Badge>
        <span className="text-ink-muted">
          {run.status === "queued" ? `Scheduled ${formatDateTime(run.scheduled_for)}` : null}
          {run.status === "running" ? `${done} of ${total || "?"} responses` : null}
          {run.finished_at ? `Finished ${formatDateTime(run.finished_at)}` : null}
        </span>
        <span className="text-small text-ink-muted">{run.engines.map(engineLabel).join(", ")}</span>
      </div>
      {run.status === "running" && total ? (
        <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-rival-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {run.status === "failed" && run.error ? <p className="text-small text-ink-muted">{run.error}</p> : null}
    </div>
  );
}
