"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { etaLabel, isFinished, type ScanProgressPayload } from "@/lib/data/scan-progress";

// Live scan progress (UX spec section 4): per-engine progress, an honest
// time estimate and a ticker of the agents each answer names, with yours
// highlighted. Polls the progress endpoint and refreshes the page once when
// the run finishes, so the wait ends on a finished result, not a spinner.
export interface LiveScanPanelProps {
  /** Scan run to follow. */
  runId: string;
  /** Free-scan access token, for unauthenticated progress reads. */
  token?: string;
  /** The tracked agency's display name, highlighted when it's found. */
  agencyName: string;
}

const POLL_MS = 2500;
const PLACEHOLDER_ENGINES = 2;

export function LiveScanPanel({ runId, token, agencyName }: LiveScanPanelProps) {
  const router = useRouter();
  const [data, setData] = useState<ScanProgressPayload | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const url = `/api/scan-progress/${runId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

    async function poll() {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const next = (await res.json()) as ScanProgressPayload;
          if (stopped) return;
          setData(next);
          if (isFinished(next.status)) {
            if (!refreshed.current) {
              refreshed.current = true;
              router.refresh();
            }
            return;
          }
        }
      } catch {
        // Network blip: keep polling.
      }
      if (!stopped) timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId, token, router]);

  const queued = !data || data.status === "queued";
  const eta = data ? etaLabel(data.etaSeconds) : null;

  return (
    <div className="rounded-lg border border-hairline bg-surface-raised p-6" aria-live="polite">
      <style>{TICKER_CSS}</style>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-heading text-ink">{queued ? "Starting your scan…" : "Scanning"}</h2>
        <p className="text-small text-ink-muted">
          {data ? (
            <>
              <span className="font-mono text-ink">{data.done}</span> of <span className="font-mono">{data.total || "?"}</span> answers
              {eta ? ` · ${eta}` : ""}
            </>
          ) : (
            <span className="inline-block h-4 w-40 rounded-sm bg-surface-sunken align-middle" aria-hidden="true" />
          )}
        </p>
      </div>

      <ul className="mt-4 space-y-3">
        {data
          ? data.perEngine.map((e) => {
              const pct = e.total ? Math.min(100, Math.round((e.done / e.total) * 100)) : 0;
              return (
                <li key={e.engine} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-small">
                  <span className="text-ink">{e.label}</span>
                  <span
                    className="h-1.5 overflow-hidden rounded-full bg-rival-soft"
                    role="progressbar"
                    aria-label={`${e.label} progress`}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span className="block h-full rounded-full bg-brand transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="font-mono text-data text-ink-muted">
                    {e.done} of {e.total || "?"}
                  </span>
                </li>
              );
            })
          : Array.from({ length: PLACEHOLDER_ENGINES }, (_, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3" aria-hidden="true">
                <span className="h-4 w-20 rounded-sm bg-surface-sunken" />
                <span className="h-1.5 rounded-full bg-rival-soft" />
                <span className="h-4 w-14 rounded-sm bg-surface-sunken" />
              </li>
            ))}
      </ul>

      <div className="mt-6 border-t border-hairline pt-4">
        <p className="text-label uppercase text-ink-muted">Named so far</p>
        {data?.ticker.length ? (
          <ul className="mt-2 space-y-1.5">
            {data.ticker.map((line) => (
              <li key={line.id} className="privett-ticker-line text-small text-ink-muted">
                <span className="text-ink">{line.label}</span> named{" "}
                {line.names.map((n, i) => (
                  <span key={`${line.id}-${i}`}>
                    {i ? ", " : ""}
                    {n.isBranch ? (
                      <strong className="rounded-sm bg-signal px-1 font-semibold text-on-signal" title={agencyName}>
                        you
                      </strong>
                    ) : (
                      n.name
                    )}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-small text-ink-muted">Agents appear here as each answer is read.</p>
        )}
      </div>
    </div>
  );
}

// Ticker lines fade and rise in once. Transform and opacity only; reduced
// motion keeps just the fade.
const TICKER_CSS = `
@keyframes privett-ticker-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes privett-ticker-fade { from { opacity: 0; } to { opacity: 1; } }
.privett-ticker-line { animation: privett-ticker-in 220ms cubic-bezier(0.23, 1, 0.32, 1) both; }
@media (prefers-reduced-motion: reduce) { .privett-ticker-line { animation: privett-ticker-fade 160ms ease-out both; } }
`;
