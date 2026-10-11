// Monochrome sparkline (UX spec 1b): the last 8 weekly values in data-rival,
// the latest point in brand. No axes. Gaps (null weeks) break the line rather
// than being drawn as zero.

export function Sparkline({
  values,
  invert = false,
  points = 8,
  className,
}: {
  values: (number | null)[];
  /** True when lower is better (position), so "up" on screen still means better. */
  invert?: boolean;
  points?: number;
  className?: string;
}) {
  const vs = values.slice(-points);
  const nums = vs.filter((v): v is number => v !== null);
  if (nums.length < 2) return <div className={className} aria-hidden="true" />;
  const w = 120;
  const h = 32;
  const pad = 4;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const step = vs.length > 1 ? (w - pad * 2) / (vs.length - 1) : 0;
  const x = (i: number) => pad + i * step;
  const y = (v: number) => {
    const t = (v - min) / span;
    return pad + (invert ? t : 1 - t) * (h - pad * 2);
  };
  const segments: string[] = [];
  let current = "";
  vs.forEach((v, i) => {
    if (v === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (current) segments.push(current);
  const lastIndex = vs.map((v, i) => (v === null ? -1 : i)).reduce((a, b) => Math.max(a, b), -1);
  const last = vs[lastIndex];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true">
      {segments.map((d) => (
        <path key={d} d={d} fill="none" stroke="rgb(var(--data-rival))" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
      {last !== null && last !== undefined ? <circle cx={x(lastIndex)} cy={y(last)} r={3} fill="rgb(var(--brand))" /> : null}
    </svg>
  );
}
