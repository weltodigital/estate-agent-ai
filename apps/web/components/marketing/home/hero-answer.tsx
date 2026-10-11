"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// The whole product in one picture: an AI answering a seller, and whether
// you're in it. Invented agencies only. It types out once (~2s), the agent's
// own name gets its lime underline as it appears, then the bars build once.
// Without JS or with reduced motion, the finished state shows immediately.

type Seg = { text: string; kind?: "agent" | "you" };

const ANSWER: Seg[] = [
  { text: "There's no single best agent, but three names come up most often in Southsea. " },
  { text: "Fenwick Ashby", kind: "agent" },
  { text: " is often recommended for family homes and has strong local reviews. " },
  { text: "Harbour & Hale", kind: "you" },
  { text: " is well regarded for both sales and lettings, with a team that knows the area. " },
  { text: "Linden & Rowe", kind: "agent" },
  { text: " suits sellers of higher-value homes who want strong marketing." },
];
const TOTAL = ANSWER.reduce((n, s) => n + s.text.length, 0);
const YOU_ENDS_AT = ANSWER.slice(0, ANSWER.findIndex((s) => s.kind === "you") + 1).reduce((n, s) => n + s.text.length, 0);
const TYPE_MS = 2000;

const BARS = [
  { name: "Fenwick Ashby", pct: 42 },
  { name: "Harbour & Hale", pct: 35, you: true },
  { name: "Linden & Rowe", pct: 28 },
  { name: "Marsh Lettings", pct: 17 },
];

function Typed({ count }: { count: number }) {
  let left = count;
  return (
    <>
      {ANSWER.map((s, i) => {
        const shown = s.text.slice(0, Math.max(0, left));
        left -= s.text.length;
        if (!shown) return null;
        if (s.kind === "you")
          return (
            <mark key={i} className="bg-transparent font-semibold text-ink underline decoration-signal decoration-[3px] underline-offset-[3px]">
              {shown}
            </mark>
          );
        if (s.kind === "agent") return <strong key={i} className="font-semibold text-ink-muted">{shown}</strong>;
        return <span key={i}>{shown}</span>;
      })}
    </>
  );
}

export function HeroAnswer() {
  // Server render = finished state (no JS, crawlers, reduced motion).
  const [count, setCount] = useState(TOTAL);
  const [built, setBuilt] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setCount(0);
    setBuilt(false);
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const n = Math.min(TOTAL, Math.round(((t - start) / TYPE_MS) * TOTAL));
      setCount(n);
      if (n < TOTAL) raf = requestAnimationFrame(tick);
      else window.setTimeout(() => setBuilt(true), 150);
    };
    const delay = window.setTimeout(() => (raf = requestAnimationFrame(tick)), 400);
    return () => {
      window.clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, []);

  const youShown = count >= YOU_ENDS_AT;
  const top = Math.max(...BARS.map((b) => b.pct));

  return (
    <div className="space-y-4" aria-label="Example: an AI assistant answering a seller in Southsea">
      <article className="rounded-lg border border-hairline bg-surface-raised shadow-pop">
        <header className="flex items-center gap-3 border-b border-hairline px-5 py-3">
          <span className="font-semibold text-ink">AI assistant</span>
          <span className="text-small text-ink-muted">Example</span>
        </header>
        <div className="space-y-3 px-5 py-4">
          <p className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-brand-tint px-4 py-2.5 text-body text-ink">
            Who&apos;s the best estate agent in Southsea?
          </p>
          {/* Both layers share one grid cell: the invisible full answer reserves
              the height, so typing never shifts the page. */}
          <div className="grid max-w-[92%] rounded-lg rounded-bl-sm bg-surface-sunken px-4 py-3 text-body text-ink">
            <p className="invisible col-start-1 row-start-1" aria-hidden="true">
              <Typed count={TOTAL} />
            </p>
            <p className={cn("col-start-1 row-start-1", !ready && "[.js_&]:opacity-0")}>
              <Typed count={count} />
              {count < TOTAL ? <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-ink-muted" aria-hidden="true" /> : null}
            </p>
          </div>
          <p className={cn("text-small text-ink-muted transition-opacity duration-150", youShown ? "opacity-100" : "opacity-0", !ready && "[.js_&]:opacity-0")}>
            <span className="rounded-sm bg-signal px-1.5 py-0.5 font-medium text-on-signal">That&apos;s you.</span>{" "}
            Named second, after Fenwick Ashby.
          </p>
        </div>
      </article>

      <div className="rounded-lg border border-hairline bg-surface-raised px-5 py-4">
        <p className="text-small text-ink-muted">Share of answers that name each agent in Southsea</p>
        <ul className="mt-3 space-y-2.5">
          {BARS.map((b, i) => (
            <li key={b.name} className="grid grid-cols-[minmax(0,8.5rem)_1fr_2.5rem] items-center gap-3 text-small">
              <span className={cn("flex items-center gap-1.5 truncate", b.you ? "font-semibold text-ink" : "text-ink-muted")}>
                {b.you ? <span className="h-2 w-2 shrink-0 rounded-full bg-signal ring-1 ring-brand/40" aria-hidden="true" /> : null}
                {b.name}
              </span>
              <span className="h-2.5 overflow-hidden rounded-sm bg-rival-soft">
                <span
                  className={cn(
                    "block h-full origin-left rounded-sm transition-transform duration-[600ms] ease-out",
                    b.you ? "bg-brand" : "bg-rival",
                    built ? "scale-x-100" : "scale-x-0",
                    !ready && "[.js_&]:scale-x-0",
                  )}
                  style={{ width: `${(b.pct / top) * 100}%`, transitionDelay: built ? `${i * 60}ms` : "0ms" }}
                />
              </span>
              <span className={cn("text-right font-mono text-data", b.you ? "text-ink" : "text-ink-muted")}>{b.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
