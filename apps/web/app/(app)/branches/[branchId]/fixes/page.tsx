import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CodeBlock } from "@/components/dashboard/copy-button";
import { Evidence } from "@/components/dashboard/evidence";
import { requireBranch } from "@/lib/auth";
import { loadRecommendations, type RecommendationRow } from "@/lib/data/branch-data";
import { COPY } from "@/lib/copy";
import { EFFORT_LABEL, firstSentence } from "@/lib/data/summary";
import { formatDate } from "@/lib/utils";
import { setRecommendationStatus } from "./actions";

export const metadata = { title: "Fixes" };

const ASSET_LABEL: Record<string, string> = {
  "json-ld": "Structured data (paste into your site’s <head>)",
  robots: "robots.txt changes",
  faq: "FAQ copy",
  "area-page": "Area page draft",
  "review-templates": "Review request templates",
  "llms-txt": "llms.txt",
  steps: "Steps",
  "valuation-page": "Valuation page outline",
};

function StatusForm({ branchId, rec, status, children, primary = false }: { branchId: string; rec: RecommendationRow; status: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <form action={setRecommendationStatus}>
      <input type="hidden" name="branch_id" value={branchId} />
      <input type="hidden" name="recommendation_id" value={rec.id} />
      <input type="hidden" name="status" value={status} />
      <button
        className={
          primary
            ? "ring-brand-focus rounded-md bg-brand px-3 py-1.5 text-small font-medium text-on-brand hover:bg-brand/90"
            : "ring-brand-focus rounded-md border border-hairline bg-surface-raised px-3 py-1.5 text-small font-medium text-ink-muted hover:bg-brand-tint"
        }
      >
        {children}
      </button>
    </form>
  );
}

function StatusBadge({ rec }: { rec: RecommendationRow }) {
  if (rec.status === "done" && rec.verified_result === "resolved") return <Badge tone="good">Done · confirmed</Badge>;
  if (rec.status === "done" && rec.verified_result === "still_present") return <Badge tone="warn">Done · still showing</Badge>;
  if (rec.status === "done") return <Badge>Done · checking next scan</Badge>;
  if (rec.status === "todo" && rec.verified_result === "resolved") return <Badge tone="good">No longer detected</Badge>;
  return null;
}

// One fix: a single line until opened, then the draft, the steps and the
// evidence, with the actions at the bottom.
function Fix({ rec, branchId, n, open = false }: { rec: RecommendationRow; branchId: string; n?: number; open?: boolean }) {
  return (
    <details id={rec.id} open={open} className="group scroll-mt-6 rounded-lg border border-hairline bg-surface-raised">
      <summary className="flex cursor-pointer list-none gap-3 px-5 py-4">
        {n ? <span className="pt-0.5 font-mono text-data text-ink-muted">{n}</span> : null}
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">{rec.title}</span>
          <span className="mt-0.5 block text-small text-ink-muted">
            {firstSentence(rec.why)} · {EFFORT_LABEL[rec.effort]}
          </span>
        </span>
        <span className="flex shrink-0 items-start gap-2">
          <StatusBadge rec={rec} />
          <span className="pt-0.5 text-small text-brand group-open:hidden">How</span>
        </span>
      </summary>

      <div className="space-y-4 border-t border-hairline px-5 py-4">
        <p className="text-sm text-ink">{rec.why}</p>

        {rec.asset_kind ? (
          <div>
            <p className="mb-2 text-small font-medium text-ink">
              {ASSET_LABEL[rec.asset_kind] ?? "Draft"} <span className="font-normal text-ink-muted">· {COPY.draftLabel}</span>
            </p>
            {rec.asset_status === "pending" ? (
              <p className="text-sm text-ink-muted">Writing your draft…</p>
            ) : rec.asset_status === "failed" ? (
              <p className="text-sm text-ink-muted">We couldn’t write this draft. It will be retried on the next scan.</p>
            ) : rec.asset_text ? (
              <CodeBlock text={rec.asset_text} label={ASSET_LABEL[rec.asset_kind] ?? rec.asset_kind} />
            ) : null}
          </div>
        ) : null}

        <details>
          <summary className="cursor-pointer text-small font-medium text-ink-muted">Why we suggest this: the evidence</summary>
          <div className="mt-3 space-y-3">
            <Evidence data={rec.evidence_json ?? {}} />
            <p className="text-small text-ink-muted">
              First found {formatDate(rec.first_seen_at)}
              {rec.completed_at ? ` · marked done ${formatDate(rec.completed_at)}` : ""}
            </p>
            <details>
              <summary className="cursor-pointer text-small text-ink-muted">Raw data</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-small text-ink-muted">
                {JSON.stringify(rec.evidence_json, null, 2)}
              </pre>
            </details>
          </div>
        </details>

        <div className="flex flex-wrap gap-2 pt-1">
          {rec.status !== "done" ? (
            <StatusForm branchId={branchId} rec={rec} status="done" primary>
              Mark as done
            </StatusForm>
          ) : null}
          {rec.status !== "todo" ? (
            <StatusForm branchId={branchId} rec={rec} status="todo">
              Move back to to do
            </StatusForm>
          ) : null}
          {rec.status === "todo" ? (
            <StatusForm branchId={branchId} rec={rec} status="dismissed">
              Not relevant
            </StatusForm>
          ) : null}
        </div>
      </div>
    </details>
  );
}

export default async function FixesPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { branch } = await requireBranch(branchId);
  const recs = await loadRecommendations(branch.id);
  const todo = recs.filter((r) => r.status === "todo");
  const now = todo.filter((r) => r.priority <= 2);
  const next = todo.filter((r) => r.priority > 2);
  const done = recs.filter((r) => r.status === "done");
  const dismissed = recs.filter((r) => r.status === "dismissed");

  if (!recs.length) {
    return (
      <EmptyState title="No fixes yet">
        Fixes are worked out from your scan results, your website and your Google profile after each scan.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-ink-muted">
        What to change so AI has more reasons to name you, most important first. Open a fix for the steps and a draft to copy. Mark it done and we’ll check it on your next scan.
      </p>

      {[
        { id: "now", title: "Do these first", items: now },
        { id: "next", title: "Then these", items: next },
      ].map((g) =>
        g.items.length ? (
          <section key={g.id} aria-labelledby={`fixes-${g.id}`} className="space-y-3">
            <h2 id={`fixes-${g.id}`} className="text-heading text-ink">{g.title}</h2>
            {g.items.map((r, i) => (
              <Fix key={r.id} rec={r} branchId={branch.id} n={(g.id === "next" ? now.length : 0) + i + 1} open={g.id === "now" && i === 0} />
            ))}
          </section>
        ) : null,
      )}
      {!todo.length ? <p className="text-ink">You’re all caught up. New fixes appear after your next scan if we spot a gap.</p> : null}

      {done.length || dismissed.length ? (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-muted">
            Done ({done.length}){dismissed.length ? ` and not relevant (${dismissed.length})` : ""}
          </summary>
          <div className="mt-3 space-y-3">
            {[...done, ...dismissed].map((r) => (
              <Fix key={r.id} rec={r} branchId={branch.id} />
            ))}
          </div>
        </details>
      ) : null}

      <p className="text-small text-ink-muted">{COPY.noPromise}</p>
    </div>
  );
}
