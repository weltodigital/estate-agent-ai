import Link from "next/link";
import { engineLabel } from "@privett/core";
import { Badge } from "@/components/ui/badge";
import { blocksToText, parseAnswer, sourceDomains, type RunOutcome } from "@/lib/data/answers";
import { formatDateTime } from "@/lib/utils";
import { AnswerBubble } from "./answer-bubble";
import { CopyAnswer } from "./copy-answer";
import { RunStrip } from "./run-strip";

export interface AnswerCardProps {
  id: string;
  engine: string;
  createdAt: string;
  question: string;
  answerText: string | null;
  parseStatus: string;
  /** Named the branch (high-confidence match). */
  namesYou: boolean;
  needsReview: boolean;
  /** Names to highlight: the branch's (incl. how the answer wrote it), and other agencies'. */
  youNames: string[];
  agentNames: string[];
  citedUrls: string[];
  runs?: RunOutcome[];
  runIndex?: number;
  /** Link to the full answer page; omitted on that page. */
  href?: string;
  /** Characters shown before "Read the full answer"; null shows it all. */
  preview?: number | null;
}

function Status({ p }: { p: Pick<AnswerCardProps, "parseStatus" | "namesYou" | "engine" | "needsReview"> }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {p.parseStatus === "pending" ? (
        <Badge>Reading…</Badge>
      ) : p.parseStatus === "engine_error" ? (
        <Badge tone="warn">No answer from {engineLabel(p.engine)}</Badge>
      ) : p.parseStatus !== "ok" ? (
        <Badge tone="warn">Couldn’t read</Badge>
      ) : p.namesYou ? (
        <Badge tone="brand">Names you</Badge>
      ) : (
        <Badge>Doesn’t name you</Badge>
      )}
      {p.needsReview ? <Badge tone="warn">Possible match to check</Badge> : null}
    </span>
  );
}

/**
 * One answer as the chat the agent would see: their question, the assistant's
 * reply with names highlighted, the sources, and how often this question named
 * them across runs. Makes sense as a screenshot on its own.
 */
export function AnswerCard(p: AnswerCardProps) {
  const blocks = parseAnswer(p.answerText, { youNames: p.youNames, agentNames: p.agentNames, citedUrls: p.citedUrls });
  const sources = sourceDomains(p.citedUrls);
  const label = engineLabel(p.engine);
  const copyText = [`“${p.question}”`, "", `${label} answered:`, blocksToText(blocks) || "(no answer)", "", "Measured by Privett"].join("\n");

  return (
    <article className="rounded-lg border border-hairline bg-surface-raised">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline px-5 py-3">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-small text-ink-muted">{formatDateTime(p.createdAt)}</span>
        <span className="ml-auto">
          <Status p={p} />
        </span>
      </header>

      <div className="space-y-3 px-5 py-4">
        <p className="ml-auto w-fit max-w-[85%] break-words rounded-lg rounded-br-sm bg-brand-tint px-4 py-2.5 text-body text-ink">{p.question}</p>
        {blocks.length ? (
          <AnswerBubble blocks={blocks} preview={p.preview === undefined ? 600 : p.preview} />
        ) : (
          <p className="max-w-[85%] rounded-lg rounded-bl-sm border border-dashed border-hairline px-4 py-3 text-small text-ink-muted">
            {p.parseStatus === "engine_error" ? `${label} didn’t return an answer for this run.` : "No answer text stored."}
          </p>
        )}

        {sources.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-small text-ink-muted">Sources</span>
            {sources.slice(0, 8).map((s) => (
              <a
                key={s.domain}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="max-w-[12rem] truncate rounded-sm bg-surface-sunken px-1.5 py-0.5 text-small text-ink-muted ring-1 ring-hairline hover:text-ink"
              >
                {s.domain}
              </a>
            ))}
            {sources.length > 8 ? <span className="text-small text-ink-muted">and {sources.length - 8} more</span> : null}
          </div>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline px-5 py-2.5">
        {p.runs ? <RunStrip runs={p.runs} current={p.runIndex} /> : null}
        <span className="ml-auto flex items-center gap-2">
          <CopyAnswer text={copyText} />
          {p.href ? (
            <Link href={p.href} className="rounded-md px-2 py-1 text-small font-medium text-brand hover:bg-brand-tint">
              Details
            </Link>
          ) : null}
        </span>
      </footer>
    </article>
  );
}
