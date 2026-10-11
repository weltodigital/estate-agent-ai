"use client";

import { useOptimistic, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { updateCompetitorStatus, type CompetitorStatus } from "./actions";

// Pin, hide and unhide update instantly, with Undo (docs/ux-spec.md section 5).
// Figures are formatted on the server; this only moves rows.

export interface CompetitorRowData {
  id: string;
  name: string;
  domain: string | null;
  status: CompetitorStatus;
  lowSample: boolean;
  cells: string[];
}

const TOAST: Record<CompetitorStatus, (n: string) => string> = {
  pinned: (n) => `Pinned ${n}`,
  hidden: (n) => `Hid ${n}`,
  discovered: (n) => `${n} is back in your list`,
};

function LinkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ring-brand-focus rounded px-1.5 py-1 text-small text-ink-muted underline-offset-2 transition-transform duration-120 ease-out active:scale-[0.97] hover-fine:underline"
    >
      {children}
    </button>
  );
}

export function CompetitorsTable({
  branchId,
  you,
  rows,
  headers,
}: {
  branchId: string;
  you: { name: string; cells: string[] };
  rows: CompetitorRowData[];
  headers: string[];
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(rows, (state, change: { id: string; status: CompetitorStatus }) =>
    state.map((r) => (r.id === change.id ? { ...r, status: change.status } : r)),
  );

  function apply(row: CompetitorRowData, status: CompetitorStatus, undoable = true) {
    const previous = row.status;
    startTransition(async () => {
      setOptimistic({ id: row.id, status });
      const res = await updateCompetitorStatus(branchId, row.id, status);
      if ("error" in res) {
        toast(res.error, { tone: "warn" });
        return;
      }
      if (undoable) toast(TOAST[status](row.name), { undo: () => apply({ ...row, status }, previous, false) });
    });
  }

  const visible = optimistic
    .filter((r) => r.status !== "hidden")
    .sort((a, b) => Number(b.status === "pinned") - Number(a.status === "pinned"));
  const hidden = optimistic.filter((r) => r.status === "hidden");
  const cell = "px-3 py-2 text-right";

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-small text-ink-muted">
            <tr>
              <th className="px-5 py-2 font-medium">Agent</th>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 text-right font-medium">
                  {h}
                </th>
              ))}
              <th className="px-5 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="font-mono">
            <tr className="border-t border-hairline bg-brand-tint font-medium">
              <td className="px-5 py-2 font-sans">
                <span className="inline-flex max-w-[16rem] items-center gap-2" title={you.name}>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-signal ring-1 ring-brand/40" aria-hidden="true" />
                  <span className="truncate">{you.name}</span> <span className="shrink-0 text-ink-muted">(you)</span>
                </span>
              </td>
              {you.cells.map((c, i) => (
                <td key={i} className={cell}>
                  {c}
                </td>
              ))}
              <td />
            </tr>
            {visible.map((r) => (
              <tr key={r.id} className={cn("border-t border-hairline", r.lowSample && "text-ink-muted")}>
                <td className="px-5 py-2 font-sans">
                  <span className="flex max-w-[16rem] items-center gap-2">
                    <span className="truncate text-ink" title={r.name}>
                      {r.name}
                    </span>
                    {r.status === "pinned" ? <Badge className="shrink-0">Pinned</Badge> : null}
                  </span>
                  {r.domain ? (
                    <span className="block max-w-[16rem] truncate text-small text-ink-muted" title={r.domain}>
                      {r.domain}
                    </span>
                  ) : null}
                </td>
                {r.cells.map((c, i) => (
                  <td key={i} className={cell}>
                    {c}
                  </td>
                ))}
                <td className="px-5 py-2">
                  <div className="flex justify-end gap-1">
                    {r.status === "pinned" ? (
                      <LinkButton onClick={() => apply(r, "discovered")}>Unpin</LinkButton>
                    ) : (
                      <LinkButton onClick={() => apply(r, "pinned")}>Pin</LinkButton>
                    )}
                    <LinkButton onClick={() => apply(r, "hidden")}>Hide</LinkButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden.length ? (
        <details className="border-t border-hairline">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-ink">Hidden ({hidden.length})</summary>
          <ul className="divide-y divide-hairline border-t border-hairline text-sm">
            {hidden.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-2">
                <span className="truncate text-ink-muted" title={r.name}>
                  {r.name}
                </span>
                <LinkButton onClick={() => apply(r, "discovered")}>Unhide</LinkButton>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
