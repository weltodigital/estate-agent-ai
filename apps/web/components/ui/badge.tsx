import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "bad" | "warn" | "brand";
const tones: Record<Tone, string> = {
  neutral: "bg-brand-cream text-brand-walnut border-brand-stone",
  good: "bg-emerald-50 text-emerald-800 border-emerald-200",
  bad: "bg-red-50 text-red-800 border-red-200",
  warn: "bg-amber-50 text-amber-900 border-amber-200",
  brand: "bg-brand-hedge text-brand-bone border-brand-hedge",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
