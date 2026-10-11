// Small brand-style diagrams for "How it works": questions -> answers -> fixes.
// Inline SVG using theme tokens, so they work in light and dark.

const S = { fill: "none", stroke: "rgb(var(--ink-muted))", strokeWidth: 1.5, strokeLinecap: "round" as const };

export function QuestionsDiagram() {
  return (
    <svg viewBox="0 0 160 96" className="h-24 w-40" aria-hidden="true">
      <rect x="44" y="8" width="108" height="22" rx="8" fill="rgb(var(--brand-tint))" />
      <rect x="28" y="38" width="124" height="22" rx="8" fill="rgb(var(--brand-tint))" />
      <rect x="60" y="68" width="92" height="22" rx="8" fill="rgb(var(--brand-tint))" />
      <path d="M56 19h60M40 49h80M72 79h50" {...S} />
    </svg>
  );
}

export function AnswersDiagram() {
  return (
    <svg viewBox="0 0 160 96" className="h-24 w-40" aria-hidden="true">
      <rect x="8" y="8" width="132" height="80" rx="10" fill="rgb(var(--surface-sunken))" />
      <path d="M22 26h96M22 42h70M22 58h88M22 74h52" {...S} />
      <path d="M96 42h28" stroke="rgb(var(--ink))" strokeWidth={2} strokeLinecap="round" />
      <path d="M96 47h28" stroke="rgb(var(--signal))" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

export function FixesDiagram() {
  return (
    <svg viewBox="0 0 160 96" className="h-24 w-40" aria-hidden="true">
      {[14, 40, 66].map((y, i) => (
        <g key={y}>
          <rect x="8" y={y} width="16" height="16" rx="4" fill={i === 0 ? "rgb(var(--brand))" : "none"} stroke={i === 0 ? "none" : "rgb(var(--hairline))"} strokeWidth={1.5} />
          {i === 0 ? <path d={`M12 ${y + 8}l3 3 5-6`} stroke="rgb(var(--on-brand))" strokeWidth={1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
          <path d={`M34 ${y + 8}h${i === 0 ? 92 : i === 1 ? 110 : 74}`} {...S} />
        </g>
      ))}
    </svg>
  );
}
