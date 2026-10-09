import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CodeBlock } from "@/components/dashboard/copy-button";
import { Evidence } from "@/components/dashboard/evidence";
import { requireBranch } from "@/lib/auth";
import { loadRecommendations, type RecommendationRow } from "@/lib/data/branch-data";
import { COPY } from "@/lib/copy";
import { formatDate } from "@/lib/utils";
import { setRecommendationStatus } from "./actions";

export const metadata = { title: "Fixes" };

const PRIORITY: Record<number, { label: string; tone: "bad" | "warn" | "neutral" }> = {
  1: { label: "Priority 1", tone: "bad" },
  2: { label: "Priority 2", tone: "warn" },
  3: { label: "Priority 3", tone: "neutral" },
  4: { label: "Priority 4", tone: "neutral" },
  5: { label: "Priority 5", tone: "neutral" },
};
const EFFORT = { S: "Small job", M: "Medium job", L: "Larger job" } as const;
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
            ? "ring-brand-focus rounded-md bg-brand-hedge px-3 py-1.5 text-xs font-medium text-brand-bone hover:bg-brand-hedge-hover"
            : "ring-brand-focus rounded-md border border-brand-stone bg-white px-3 py-1.5 text-xs font-medium text-brand-walnut hover:bg-brand-cream"
        }
      >
        {children}
      </button>
    </form>
  );
}

function FixCard({ rec, branchId }: { rec: RecommendationRow; branchId: string }) {
  const p = PRIORITY[rec.priority] ?? PRIORITY[3]!;
  return (
    <article className="rounded-lg border border-brand-stone bg-white shadow-card">
      <div className="space-y-2 px-5 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={p.tone}>{p.label}</Badge>
          <Badge>{EFFORT[rec.effort]}</Badge>
          {rec.status === "done" && rec.verified_result === "resolved" ? <Badge tone="good">Re-checked: resolved</Badge> : null}
          {rec.status === "done" && rec.verified_result === "still_present" ? <Badge tone="warn">Re-checked: still present</Badge> : null}
          {rec.status === "done" && !rec.verified_result ? <Badge>Re-checked on your next scan</Badge> : null}
          {rec.status === "todo" && rec.verified_result === "resolved" ? <Badge tone="good">No longer detected</Badge> : null}
        </div>
        <h3 className="text-xl text-brand-ink">{rec.title}</h3>
        <p className="text-sm text-brand-walnut">{rec.why}</p>
        <p className="text-xs text-brand-slate">
          First found {formatDate(rec.first_seen_at)}
          {rec.completed_at ? ` · marked done ${formatDate(rec.completed_at)}` : ""}
        </p>
      </div>

      <details className="border-t border-brand-stone">
        <summary className="cursor-pointer px-5 py-2.5 text-sm font-medium text-brand-ink">The evidence</summary>
        <div className="space-y-3 px-5 pb-4">
          <Evidence data={rec.evidence_json ?? {}} />
          <details>
            <summary className="cursor-pointer text-xs text-brand-slate">Raw data</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-brand-walnut">
              {JSON.stringify(rec.evidence_json, null, 2)}
            </pre>
          </details>
        </div>
      </details>

      {rec.asset_kind ? (
        <div className="border-t border-brand-stone px-5 py-4">
          <p className="mb-2 text-xs font-medium text-brand-terracotta">{COPY.draftLabel}</p>
          {rec.asset_status === "pending" ? (
            <p className="text-sm text-brand-slate">Generating…</p>
          ) : rec.asset_status === "failed" ? (
            <p className="text-sm text-brand-slate">We couldn’t generate this draft. It will be retried on the next scan.</p>
          ) : rec.asset_text ? (
            <CodeBlock text={rec.asset_text} label={ASSET_LABEL[rec.asset_kind] ?? rec.asset_kind} />
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-brand-stone px-5 py-3">
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
        {rec.status !== "dismissed" ? (
          <StatusForm branchId={branchId} rec={rec} status="dismissed">
            Dismiss
          </StatusForm>
        ) : null}
      </div>
    </article>
  );
}

export default async function FixesPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { branch } = await requireBranch(branchId);
  const recs = await loadRecommendations(branch.id);
  const groups = [
    { status: "todo", title: "To do", items: recs.filter((r) => r.status === "todo") },
    { status: "done", title: "Done", items: recs.filter((r) => r.status === "done") },
    { status: "dismissed", title: "Dismissed", items: recs.filter((r) => r.status === "dismissed") },
  ];

  if (!recs.length) {
    return (
      <EmptyState title="No fixes yet">
        Fixes are worked out from your scan results, your website and your Google profile after each scan. Each one shows the evidence behind it.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-sm text-brand-walnut">
        Prioritised from your own data and the gap to the agents AI names instead. Mark a fix as done and we’ll re-check it on your next scan, and mark the date on your trend chart. {COPY.noPromise}
      </p>
      {groups.map((g) =>
        g.items.length ? (
          <section key={g.status} aria-labelledby={`fixes-${g.status}`}>
            <h2 id={`fixes-${g.status}`} className="mb-3 text-2xl text-brand-ink">
              {g.title} <span className="text-base tabular-nums text-brand-slate">({g.items.length})</span>
            </h2>
            {g.status === "dismissed" ? (
              <details>
                <summary className="cursor-pointer text-sm text-brand-walnut">Show dismissed fixes</summary>
                <div className="mt-3 space-y-4">
                  {g.items.map((r) => (
                    <FixCard key={r.id} rec={r} branchId={branch.id} />
                  ))}
                </div>
              </details>
            ) : (
              <div className="space-y-4">
                {g.items.map((r) => (
                  <FixCard key={r.id} rec={r} branchId={branch.id} />
                ))}
              </div>
            )}
          </section>
        ) : null,
      )}
    </div>
  );
}
