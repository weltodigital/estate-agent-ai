"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// All of this is the agent's own traffic, so every source is brand, stepped
// down in opacity (BRANDING.md: the agent is the only colour on the chart).
const COLOURS = [1, 0.75, 0.55, 0.38, 0.24].map((a) => `rgb(var(--brand) / ${a})`);
const GRID = "rgb(var(--data-rival-soft))";
const MUTED = "rgb(var(--ink-muted))";
const weekFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function ReferralChart({ data, sources }: { data: Record<string, number | string>[]; sources: { id: string; label: string }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tickFormatter={(w: string) => weekFmt.format(new Date(w))} tick={{ fontSize: 11, fill: MUTED }} stroke={GRID} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: MUTED }} stroke={GRID} />
          <Tooltip labelFormatter={(w) => `Week of ${weekFmt.format(new Date(String(w)))}`} contentStyle={{ background: "rgb(var(--surface-raised))", borderColor: "rgb(var(--hairline))", borderRadius: 10, fontSize: 12, color: "rgb(var(--ink))" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {sources.map((s, i) => (
            <Bar key={s.id} dataKey={s.id} name={s.label} stackId="a" fill={COLOURS[i % COLOURS.length]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
