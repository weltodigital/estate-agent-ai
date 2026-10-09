"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLOURS = ["#2E3B36", "#9A968A", "#C9B8A0", "#4A453A", "#B5663D"];
const weekFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function ReferralChart({ data, sources }: { data: Record<string, number | string>[]; sources: { id: string; label: string }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#E4DFD0" vertical={false} />
          <XAxis dataKey="week" tickFormatter={(w: string) => weekFmt.format(new Date(w))} tick={{ fontSize: 11, fill: "#9A968A" }} stroke="#E4DFD0" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9A968A" }} stroke="#E4DFD0" />
          <Tooltip labelFormatter={(w) => `Week of ${weekFmt.format(new Date(String(w)))}`} contentStyle={{ borderColor: "#E4DFD0", borderRadius: 6, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {sources.map((s, i) => (
            <Bar key={s.id} dataKey={s.id} name={s.label} stackId="a" fill={COLOURS[i % COLOURS.length]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
