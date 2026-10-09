// Tiny inline SVG sparkline. Gaps (null weeks) break the line rather than
// being drawn as zero.

export function Sparkline({ values, invert = false, className }: { values: (number | null)[]; invert?: boolean; className?: string }) {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return <div className={className} aria-hidden="true" />;
  const w = 120;
  const h = 32;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const y = (v: number) => {
    const t = (v - min) / span;
    return 2 + (invert ? t : 1 - t) * (h - 4);
  };
  const segments: string[] = [];
  let current = "";
  values.forEach((v, i) => {
    if (v === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (current) segments.push(current);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden="true">
      {segments.map((d) => (
        <path key={d} d={d} fill="none" stroke="rgb(var(--brand))" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
