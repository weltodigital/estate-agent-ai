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
      ? "No earlier period"
      : card.key === "position"
        ? `${sign}${abs.toFixed(1)} vs previous ${days} days`
        : `${sign}${abs.toFixed(abs < 10 ? 1 : 0)}${copy.changeUnit} vs previous ${days} days`;

  return (
    <div className="flex flex-col rounded-lg border border-hairline bg-surface-raised">
      <Link
        href={evidenceHref}
        className="ring-brand-focus group block rounded-t-lg px-6 pb-4 pt-5 hover:bg-surface-sunken/50"
        aria-label={`View the responses behind ${copy.label}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-label uppercase text-ink-muted">{copy.label}</span>
          <InfoTip>
            <span className="block font-medium text-ink">{copy.formula}</span>
            <span className="mt-1 block">{sampleText(card.key, m.responses, m.mentions, m.sentimentSamples)}</span>
          </InfoTip>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <span className="font-mono text-metric text-ink">{copy.format(card.current)}</span>
          <Sparkline values={card.trend} invert={card.key === "position"} className="h-8 w-24" />
        </div>
        <div className="mt-2">
          {m.lowSample ? (
            <span className="inline-flex items-center gap-1 text-small text-warn">
              <AlertTriangle size={14} strokeWidth={1.5} aria-hidden="true" /> Low sample
            </span>
          ) : (
            <Delta value={card.change} improved={improved} text={deltaText} />
          )}
        </div>
        <p className="mt-1 font-mono text-data text-ink-muted">{evidenceLine(card.key, m)}</p>
      </Link>

      {card.key === "sentiment" && m.topDescriptors.length ? (
        <div className="flex flex-wrap gap-1.5 px-6 pb-4">
          {m.topDescriptors.slice(0, 3).map((d) => (
            <span key={d.descriptor} className="rounded-sm bg-surface-sunken px-1.5 py-0.5 text-small text-ink-muted">
              {d.descriptor}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto border-t border-hairline px-6 py-3">
        {card.competitors.length ? (
          <ul className="space-y-1 text-small">
            {card.competitors.map((c) => (
              <li key={c.name} className="flex justify-between gap-2 text-ink-muted">
                <span className="truncate">{c.name}</span>
                <span className="font-mono text-data text-ink">{copy.format(c.value)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-ink-muted">No competitors named in this period.</p>
        )}
      </div>
    </div>
  );
}
