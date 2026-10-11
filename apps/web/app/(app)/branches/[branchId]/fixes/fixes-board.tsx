"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/dashboard/copy-button";
import { Evidence } from "@/components/dashboard/evidence";
import { useToast } from "@/components/ui/toast";
import type { RecommendationRow } from "@/lib/data/branch-data";
import { COPY } from "@/lib/copy";
import { validateJsonLd } from "@/lib/data/json-ld";
import { cn } from "@/lib/utils";
import { fmtDate } from "@privett/core";
import { updateRecommendationStatus, type FixStatus } from "./actions";

// Fixes that feel satisfying to finish (docs/ux-spec.md section 7):
// optimistic status changes with Undo, a progress ring, a lime tick on done.

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
const EFFORT: Record<RecommendationRow["effort"], string> = { S: "Quick win", M: "A few hours", L: "A bigger job" };
const impact = (priority: number) => (priority <= 2 ? "high impact" : priority === 3 ? "medium impact" : "low impact");
const DONE_TOAST: Record<FixStatus, string> = { done: "Marked as done", dismissed: "Marked as not relevant", todo: "Moved back to to do" };

function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="flex items-center gap-4">
      <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="6" className="stroke-rival-soft" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-brand transition-[stroke-dashoffset] duration-240 ease-out"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 30 30)"
        />
      </svg>
      <div>
        <p className="text-heading text-ink">
          <span className="font-mono">{done}</span> of <span className="font-mono">{total}</span> done
        </p>
        <p className="text-small text-ink-muted">Mark a fix as done and we’ll check it on your next scan.</p>
      </div>
    </div>
  );
}

function RecheckBadge({ rec }: { rec: RecommendationRow }) {
  if (rec.status === "done" && rec.verified_result === "resolved") return <Badge tone="good">Resolved ✓</Badge>;
  if (rec.status === "done" && rec.verified_result === "still_present") return <Badge tone="warn">Still present</Badge>;
  if (rec.status === "done") return <Badge>Checking next scan</Badge>;
  if (rec.status === "todo" && rec.verified_result === "resolved") return <Badge tone="good">No longer detected</Badge>;
  return null;
}

function ActionButton({ onClick, primary, children }: { onClick: () => void; primary?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "ring-brand-focus rounded-md px-3 py-1.5 text-small font-semibold transition-[transform,background-color] duration-120 ease-out active:scale-[0.97]",
        primary ? "bg-brand text-on-brand hover-fine:bg-brand/90" : "border border-hairline bg-surface-raised text-ink-muted hover-fine:bg-brand-tint",
      )}
    >
      {children}
    </button>
  );
}

function Fix({
  rec,
  n,
  open,
  ticked,
  onStatus,
}: {
  rec: RecommendationRow;
  n?: number;
  open?: boolean;
  ticked: boolean;
  onStatus: (rec: RecommendationRow, status: FixStatus) => void;
}) {
  const schemaOk = rec.asset_kind === "json-ld" && rec.asset_text ? validateJsonLd(rec.asset_text) : null;
  return (
    <details id={rec.id} open={open} className="group scroll-mt-6 animate-fade-in-up rounded-lg border border-hairline bg-surface-raised">
      <summary className="flex cursor-pointer list-none gap-3 px-5 py-4">
        {ticked ? (
          <span className="flex h-5 w-5 shrink-0 animate-tick-pop items-center justify-center rounded-full bg-signal text-on-signal">
            <Check size={13} strokeWidth={2} aria-hidden="true" />
          </span>
        ) : n ? (
          <span className="w-5 shrink-0 pt-0.5 font-mono text-data text-ink-muted">{n}</span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">{rec.title}</span>
          <span className="mt-0.5 block text-small text-ink-muted">
            {firstSentence(rec.why)} · {EFFORT[rec.effort]} · {impact(rec.priority)}
          </span>
        </span>
        <span className="flex shrink-0 items-start gap-2">
          <RecheckBadge rec={rec} />
          <span className="pt-0.5 text-small text-brand group-open:hidden">How</span>
        </span>
      </summary>

      <div className="space-y-4 border-t border-hairline px-5 py-4">
        <p className="text-sm text-ink">{rec.why}</p>

        {rec.asset_kind ? (
          <div>
            <p className="mb-2 flex flex-wrap items-center gap-2 text-small font-medium text-ink">
              {ASSET_LABEL[rec.asset_kind] ?? "Draft"} <span className="font-normal text-ink-muted">· {COPY.draftLabel}</span>
              {schemaOk === true ? <Badge tone="good">Valid schema</Badge> : null}
              {schemaOk === false ? <Badge tone="warn">Check this draft</Badge> : null}
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
              First found {fmtDate(rec.first_seen_at)}
              {rec.completed_at ? ` · marked done ${fmtDate(rec.completed_at)}` : ""}
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
            <ActionButton primary onClick={() => onStatus(rec, "done")}>
              Mark as done
            </ActionButton>
          ) : null}
          {rec.status !== "todo" ? <ActionButton onClick={() => onStatus(rec, "todo")}>Move back to to do</ActionButton> : null}
          {rec.status === "todo" ? <ActionButton onClick={() => onStatus(rec, "dismissed")}>Not relevant</ActionButton> : null}
        </div>
      </div>
    </details>
  );
}

export function FixesBoard({ branchId, recs }: { branchId: string; recs: RecommendationRow[] }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(recs, (state, change: { id: string; status: FixStatus }) =>
    state.map((r) =>
      r.id === change.id
        ? { ...r, status: change.status, completed_at: change.status === "done" ? new Date().toISOString() : null, verified_result: null }
        : r,
    ),
  );
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  function apply(rec: RecommendationRow, status: FixStatus, undoable = true) {
    const previous = rec.status;
    if (status === "done") setTicked((s) => new Set(s).add(rec.id));
    startTransition(async () => {
      setOptimistic({ id: rec.id, status });
      const res = await updateRecommendationStatus(branchId, rec.id, status);
      if ("error" in res) {
        setTicked((s) => {
          const n = new Set(s);
          n.delete(rec.id);
          return n;
        });
        toast(res.error, { tone: "warn" });
        return;
      }
      if (undoable) toast(DONE_TOAST[status], { undo: () => apply({ ...rec, status }, previous, false) });
    });
  }

  // A to-do fix that later scans no longer detect isn't something to do.
  const noLongerNeeded = optimistic.filter((r) => r.status === "todo" && r.verified_result === "resolved");
  const todo = optimistic.filter((r) => r.status === "todo" && r.verified_result !== "resolved");
  const now = todo.filter((r) => r.priority <= 2);
  const next = todo.filter((r) => r.priority > 2);
  const done = optimistic.filter((r) => r.status === "done");
  const dismissed = [...optimistic.filter((r) => r.status === "dismissed"), ...noLongerNeeded];

  return (
    <div className="space-y-10">
      <ProgressRing done={done.length} total={todo.length + done.length} />

      {[
        { id: "now", title: "Do these first", items: now },
        { id: "next", title: "Then these", items: next },
      ].map((g) =>
        g.items.length ? (
          <section key={g.id} aria-labelledby={`fixes-${g.id}`} className="space-y-3">
            <h2 id={`fixes-${g.id}`} className="text-heading text-ink">
              {g.title}
            </h2>
            {g.items.map((r, i) => (
              <Fix
                key={r.id}
                rec={r}
                n={(g.id === "next" ? now.length : 0) + i + 1}
                open={g.id === "now" && i === 0}
                ticked={false}
                onStatus={apply}
              />
            ))}
          </section>
        ) : null,
      )}
      {!todo.length ? <p className="text-ink">You’re all caught up. New fixes appear after your next scan if we spot a gap.</p> : null}

      {done.length ? (
        <section aria-labelledby="fixes-done" className="space-y-3">
          <h2 id="fixes-done" className="text-heading text-ink">
            Done <span className="font-normal text-ink-muted">· re-checked on your next scan</span>
          </h2>
          {done.map((r) => (
            <Fix key={r.id} rec={r} ticked={ticked.has(r.id)} onStatus={apply} />
          ))}
        </section>
      ) : null}

      {dismissed.length ? (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-muted">Not relevant ({dismissed.length})</summary>
          <div className="mt-3 space-y-3">
            {dismissed.map((r) => (
              <Fix key={r.id} rec={r} ticked={false} onStatus={apply} />
            ))}
          </div>
        </details>
      ) : null}

      <SourcesLink branchId={branchId} />
    </div>
  );
}

export function SourcesLink({ branchId }: { branchId: string }) {
  return (
    <Link
      href={`/branches/${branchId}/citations`}
      className="group flex items-center justify-between gap-4 rounded-lg border border-hairline bg-surface-raised px-5 py-4 transition-colors duration-120 hover-fine:bg-surface-sunken"
    >
      <span>
        <span className="block font-medium text-ink">Where AI gets its information</span>
        <span className="block text-small text-ink-muted">The websites AI read, which have a page about you, and the gaps behind these fixes.</span>
      </span>
      <ArrowRight size={16} strokeWidth={1.5} className="shrink-0 text-ink-muted" />
    </Link>
  );
}
