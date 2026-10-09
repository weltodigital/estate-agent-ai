import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InfoTip } from "@/components/ui/info-tip";
import { isImprovement, type CardData } from "@/lib/data/overview";
import { cn } from "@/lib/utils";
import { METRIC_COPY, sampleText } from "./metric-copy";
import { Sparkline } from "./sparkline";

export function MetricCard({ card, evidenceHref, days }: { card: CardData; evidenceHref: string; days: number }) {
  const copy = METRIC_COPY[card.key];
  const m = card.metrics;
  const low = m.lowSample;
  const improved = isImprovement(card.key, card.change);
  const changeAbs = card.change === null ? null : Math.abs(card.change);
  const changeText =
    changeAbs === null
      ? "No previous period to compare"
      : card.key === "position"
        ? `${changeAbs.toFixed(1)} places ${improved ? "higher" : "lower"} than the previous ${days} days`
        : `${changeAbs.toFixed(changeAbs < 10 ? 1 : 0)}${copy.changeUnit} ${card.change! >= 0 ? "up" : "down"} on the previous ${days} days`;

  return (
    <div className="flex flex-col rounded-lg border border-brand-stone bg-white shadow-card">
      <div className="flex items-center justify-between gap-2 px-5 pt-4">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm text-brand-ink">{copy.label}</h4>
          <InfoTip>
            <span className="block font-medium text-brand-ink">{copy.formula}</span>
            <span className="mt-1 block">{sampleText(card.key, m.responses, m.mentions, m.sentimentSamples)}</span>
          </InfoTip>
        </div>
        {low ? <Badge tone="warn">Low sample</Badge> : null}
      </div>

      <Link href={evidenceHref} className="ring-brand-focus group block px-5 pb-3 pt-2" aria-label={`See the responses behind ${copy.label}`}>
        <div className="flex items-end justify-between gap-3">
          <span className={cn("tabular-nums text-4xl font-medium", low ? "text-brand-slate" : "text-brand-ink")}>
            {copy.format(card.current)}
          </span>
          <Sparkline values={card.trend} invert={card.key === "position"} className="h-8 w-28" />
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-brand-walnut">
          {improved === true ? <ArrowUpRight size={14} strokeWidth={1.5} className="text-brand-ink" /> : null}
          {improved === false ? <ArrowDownRight size={14} strokeWidth={1.5} className="text-brand-ink" /> : null}
          <span className="tabular-nums">{changeText}</span>
        </p>
        <p className="mt-2 text-xs text-brand-slate group-hover:text-brand-walnut">{copy.blurb} See the evidence.</p>
      </Link>

      {card.key === "sentiment" ? (
        <div className="px-5 pb-3">
          {m.topDescriptors.length ? (
            <div className="flex flex-wrap gap-1.5">
              {m.topDescriptors.slice(0, 3).map((d) => (
                <Badge key={d.descriptor}>{d.descriptor}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-brand-slate">No descriptors yet.</p>
          )}
        </div>
      ) : null}

      <div className="mt-auto border-t border-brand-stone px-5 py-3">
        {card.competitors.length ? (
          <ul className="space-y-1 text-xs">
            {card.competitors.map((c) => (
              <li key={c.name} className="flex justify-between gap-2 text-brand-walnut">
                <span className="truncate">{c.name}</span>
                <span className="tabular-nums text-brand-ink">{copy.format(c.value)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-brand-slate">No competitors named in this period.</p>
        )}
      </div>
    </div>
  );
}
