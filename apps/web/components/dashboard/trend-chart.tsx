"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetricKey, TrendPoint } from "@/lib/data/overview";
import { cn } from "@/lib/utils";

const COLOURS = ["#2E3B36", "#9A968A", "#C9B8A0", "#4A453A"]; // hedge, slate, sand, walnut
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
              "ring-brand-focus rounded-full border px-3 py-1 text-xs font-medium",
              metric === k ? "border-brand-hedge bg-brand-hedge text-brand-bone" : "border-brand-stone bg-white text-brand-walnut",
            )}
          >
            {LABELS[k]}
          </button>
        ))}
      </div>
      {points.length < 2 ? (
        <p className="py-10 text-center text-sm text-brand-slate">Trends appear after two weeks of scans.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="#E4DFD0" vertical={false} />
              <XAxis dataKey="week" tickFormatter={(w: string) => weekFmt.format(new Date(w))} tick={{ fontSize: 11, fill: "#9A968A" }} stroke="#E4DFD0" />
              <YAxis
                reversed={metric === "position"}
                tick={{ fontSize: 11, fill: "#9A968A" }}
                stroke="#E4DFD0"
                domain={metric === "position" ? [1, "auto"] : [0, metric === "sentiment" ? 100 : "auto"]}
                allowDecimals={metric === "position"}
              />
              <Tooltip
                formatter={(v) => fmtValue(metric, v)}
                labelFormatter={(w) => `Week of ${weekFmt.format(new Date(String(w)))}`}
                contentStyle={{ borderColor: "#E4DFD0", borderRadius: 6, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {markers.map((f) => (
                <ReferenceLine key={f.week + f.title} x={f.week} stroke="#B5663D" strokeDasharray="4 3" label={{ value: "Fix done", position: "insideTopRight", fill: "#B5663D", fontSize: 10 }} />
              ))}
              {series.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={COLOURS[i % COLOURS.length]}
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
        <ul className="mt-3 space-y-0.5 text-xs text-brand-walnut">
          {markers.map((f) => (
            <li key={f.week + f.title}>
              <span className="text-brand-terracotta">Fix done</span> week of {weekFmt.format(new Date(f.week))}: {f.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
