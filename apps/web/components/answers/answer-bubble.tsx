"use client";

import { useState } from "react";
import { truncateBlocks, type Block, type Inline } from "@/lib/data/answers";

function Segment({ x }: { x: Inline }) {
  switch (x.kind) {
    case "you":
      // Signal Lime is a highlighter only: the marker, never the text colour.
      // A thick lime underline keeps ink text readable in both themes.
      return (
        <mark className="bg-transparent font-semibold text-ink underline decoration-signal decoration-[3px] underline-offset-[3px]">
          {x.text}
        </mark>
      );
    case "agent":
      return <strong className="font-semibold text-ink-muted">{x.text}</strong>;
    case "cite":
      return x.url ? (
        <a
          href={x.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 items-center justify-center rounded-sm bg-surface-raised px-1 align-middle font-mono text-[10px] leading-none text-ink-muted ring-1 ring-hairline hover:text-ink"
          aria-label={`Source ${x.n}`}
        >
          {x.n}
        </a>
      ) : (
        <span className="mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 items-center justify-center rounded-sm px-1 align-middle font-mono text-[10px] leading-none text-ink-muted ring-1 ring-hairline">
          {x.n}
        </span>
      );
    case "source":
      return (
        <a
          href={x.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mx-0.5 inline-block rounded-sm bg-surface-raised px-1.5 align-baseline text-small text-ink-muted ring-1 ring-hairline hover:text-ink"
        >
          {x.label}
        </a>
      );
    default:
      return <>{x.text}</>;
  }
}

function Blocks({ blocks }: { blocks: Block[] }) {
  const out: React.ReactNode[] = [];
  let list: Block[] = [];
  const flushList = (key: string) => {
    if (!list.length) return;
    out.push(
      <ul key={key} className="list-disc space-y-1 pl-5">
        {list.map((b, i) => (
          <li key={i}>
            {b.inlines.map((x, j) => (
              <Segment key={j} x={x} />
            ))}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };
  blocks.forEach((b, i) => {
    if (b.kind === "li") {
      list.push(b);
      return;
    }
    flushList(`l${i}`);
    out.push(
      b.kind === "h" ? (
        <p key={i} className="font-semibold text-ink">
          {b.inlines.map((x, j) => (
            <Segment key={j} x={x} />
          ))}
        </p>
      ) : (
        <p key={i}>
          {b.inlines.map((x, j) => (
            <Segment key={j} x={x} />
          ))}
        </p>
      ),
    );
  });
  flushList("end");
  return <>{out}</>;
}

/** The assistant's answer as a chat bubble, shortened until "Read the full answer". */
export function AnswerBubble({ blocks, preview = 600 }: { blocks: Block[]; preview?: number | null }) {
  const [open, setOpen] = useState(false);
  const cut = preview ? truncateBlocks(blocks, preview) : { blocks, truncated: false };
  const shown = open || !cut.truncated ? blocks : cut.blocks;
  return (
    <div className="max-w-[85%] space-y-2 break-words rounded-lg rounded-bl-sm border border-hairline bg-surface-sunken px-4 py-3 text-body text-ink">
      <Blocks blocks={shown} />
      {cut.truncated ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ring-brand-focus rounded-sm text-small font-medium text-brand hover:underline"
          aria-expanded={open}
        >
          {open ? "Show less" : "Read the full answer"}
        </button>
      ) : null}
    </div>
  );
}
