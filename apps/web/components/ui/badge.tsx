import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "bad" | "warn" | "brand" | "signal";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-ink-muted border-hairline",
  good: "bg-up/10 text-up border-up/30",
  bad: "bg-down/10 text-down border-down/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  brand: "bg-brand-tint text-brand border-brand/20",
  // Highlighter only: "you" markers and new results. Text stays ink.
  signal: "bg-signal text-on-signal border-signal",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-small font-medium", tones[tone], className)}>
      {/* warn always carries an icon as well as a word (BRANDING.md). */}
      {tone === "warn" ? <AlertTriangle size={12} strokeWidth={1.5} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/** Signed change with arrow and colour. Never colour alone. */
export function Delta({ value, improved, text }: { value: number | null; improved: boolean | null; text: string }) {
  if (value === null || improved === null) return <span className="font-mono text-data text-ink-muted">{text}</span>;
  return (
    <span className={cn("font-mono text-data", improved ? "text-up" : "text-down")}>
      {improved ? "▲" : "▼"} {text}
    </span>
  );
}
