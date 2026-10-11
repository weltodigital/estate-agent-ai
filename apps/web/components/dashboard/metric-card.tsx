import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Delta } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";
import { isImprovement, type CardData } from "@/lib/data/overview";
import { METRIC_COPY, sampleText } from "./metric-copy";
import { Sparkline } from "./sparkline";

// Metric card per BRANDING.md: label, number in Geist Mono (never coloured),
// signed delta, then the evidence. Below the sample threshold the delta is
// replaced by a low-sample notice.

function evidenceLine(key: CardData["key"], m: CardData["metrics"]): string {
  if (key === "visibility") return `Named in ${m.mentions} of ${m.responses} responses`;
  if (key === "shareOfVoice") return `${m.mentions} of ${m.totalAgentMentions} agent mentions`;
  if (key === "sentiment") return `Scored in ${m.sentimentSamples} responses`;
  return `Ranked in ${m.mentions} responses`;
}

export function MetricCard({ card, evidenceHref, days }: { card: CardData; evidenceHref: string; days: number }) {
  const copy = METRIC_COPY[card.key];
  const m = card.metrics;
  const improved = isImprovement(card.key, card.change);
  const abs = card.change === null ? null : Math.abs(card.change);
  const sign = improved === null ? "" : card.key === "position" ? (card.change! < 0 ? "−" : "+") : card.change! > 0 ? "+" : "−";
  const deltaText =
    abs === null
      ? null
      : card.key === "position"
        ? `${sign}${abs.toFixed(1)}`
        : `${sign}${abs.toFixed(abs < 10 ? 1 : 0)}${copy.changeUnit}`;

  return (
    <div className="flex min-w-0 flex-col rounded-lg border border-hairline bg-surface-raised">
      <Link
        href={evidenceHref}
        className="ring-brand-focus group block rounded-t-lg px-5 pb-4 pt-4 transition-colors duration-150 hover:bg-surface-sunken/60"
        aria-label={`View the answers behind ${copy.label}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-label uppercase text-ink-muted">{copy.label}</span>
          <InfoTip>
            <span className="block font-medium text-ink">{copy.formula}</span>
            <span className="mt-1 block">{sampleText(card.key, m.responses, m.mentions, m.sentimentSamples)}</span>
          </InfoTip>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="font-mono text-[28px] font-medium leading-9 tracking-[-0.03em] text-ink tabular-nums sm:text-metric">
            {copy.format(card.current)}
          </span>
          <Sparkline values={card.trend} invert={card.key === "position"} className="h-8 w-20 shrink-0 sm:w-24" />
        </div>
        <div className="mt-2 min-h-5">
          {m.lowSample ? (
            <span className="inline-flex items-center gap-1 text-small text-warn">
              <AlertTriangle size={14} strokeWidth={1.5} aria-hidden="true" /> Low sample
            </span>
          ) : deltaText ? (
            <Delta value={card.change} improved={improved} text={deltaText} />
          ) : (
            <span className="text-small text-ink-muted">No earlier scan to compare yet</span>
          )}
        </div>
        {card.previous !== null ? (
          <p className="mt-1 font-mono text-data text-ink-muted tabular-nums">{`${copy.format(card.previous)} previous ${days} days`}</p>
        ) : null}
        <p className="font-mono text-data text-ink-muted tabular-nums">{evidenceLine(card.key, m)}</p>
      </Link>

      {card.competitors.length ? (
        <ul className="mt-auto space-y-1 border-t border-hairline px-5 py-3 text-small">
          {card.competitors.map((c) => (
            <li key={c.name} className="flex justify-between gap-2 text-ink-muted">
              <span className="truncate" title={c.name}>{c.name}</span>
              <span className="font-mono text-data text-ink tabular-nums">{copy.format(c.value)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
