"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetricKey, TrendPoint } from "@/lib/data/overview";
import { cn } from "@/lib/utils";

// The agent is the only colour on the chart: their series is brand, every
// competitor is data-rival, told apart by dash pattern (BRANDING.md).
const BRAND = "rgb(var(--brand))";
const RIVAL = "rgb(var(--data-rival))";
const GRID = "rgb(var(--data-rival-soft))";
const MUTED = "rgb(var(--ink-muted))";
const RIVAL_DASHES = ["", "6 3", "2 3", "8 3 2 3"];
const LABELS: Record<MetricKey, string> = {
  visibility: "Visibility",
  position: "Position",
  sentiment: "Sentiment",
  shareOfVoice: "Share of voice",
};

const weekFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function fmtValue(key: MetricKey, v: unknown) {
  if (typeof v !== "number") return "—";
  if (key === "position") return `#${v.toFixed(1)}`;
  if (key === "sentiment") return `${Math.round(v)}`;
  return `${Math.round(v)}%`;
}

export function TrendChart({
  data,
  series,
  fixes,
}: {
  data: Record<MetricKey, TrendPoint[]>;
  series: string[];
  /** Fix completions, as the Monday of the week they were completed. */
  fixes: { week: string; title: string }[];
}) {
  const [metric, setMetric] = useState<MetricKey>("visibility");
  const points = data[metric];
  const weeks = new Set(points.map((p) => p.week));
  const markers = fixes.filter((f) => weeks.has(f.week));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Metric">
        {(Object.keys(LABELS) as MetricKey[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={metric === k}
            onClick={() => setMetric(k)}
            className={cn(
              "ring-brand-focus rounded-full border px-3 py-1 text-small font-medium",
              metric === k ? "border-brand bg-brand text-on-brand" : "border-hairline bg-surface-raised text-ink-muted",
            )}
          >
            {LABELS[k]}
          </button>
        ))}
      </div>
      {points.length < 2 ? (
        <p className="py-10 text-center text-sm text-ink-muted">Trends appear after two weeks of scans.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="week" tickFormatter={(w: string) => weekFmt.format(new Date(w))} tick={{ fontSize: 11, fill: MUTED }} stroke={GRID} />
              <YAxis
                reversed={metric === "position"}
                tick={{ fontSize: 11, fill: MUTED }}
                stroke={GRID}
                domain={metric === "position" ? [1, "auto"] : [0, metric === "sentiment" ? 100 : "auto"]}
                allowDecimals={metric === "position"}
              />
              <Tooltip
                formatter={(v) => fmtValue(metric, v)}
                labelFormatter={(w) => `Week of ${weekFmt.format(new Date(String(w)))}`}
                contentStyle={{ background: "rgb(var(--surface-raised))", borderColor: "rgb(var(--hairline))", borderRadius: 10, fontSize: 12, color: "rgb(var(--ink))" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {markers.map((f) => (
                <ReferenceLine key={f.week + f.title} x={f.week} stroke={MUTED} strokeDasharray="2 3" label={{ value: "Fix done", position: "insideTopRight", fill: MUTED, fontSize: 10 }} />
              ))}
              {series.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={i === 0 ? BRAND : RIVAL}
                  strokeDasharray={i === 0 ? undefined : RIVAL_DASHES[(i - 1) % RIVAL_DASHES.length]}
                  strokeWidth={i === 0 ? 2.5 : 1.5}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {markers.length ? (
        <ul className="mt-3 space-y-0.5 text-small text-ink-muted">
          {markers.map((f) => (
            <li key={f.week + f.title}>
              <span className="text-brand">Fix done</span> week of {weekFmt.format(new Date(f.week))}: {f.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
