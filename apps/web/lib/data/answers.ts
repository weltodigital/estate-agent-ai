// Turns a stored AI answer (Markdown-ish text with citation markers) into
// display blocks with agency names highlighted. Pure and unit tested: the
// answer card renders these segments as React nodes, never raw HTML.

export type Inline =
  | { kind: "text"; text: string }
  /** The tracked branch, by any of its names. */
  | { kind: "you"; text: string }
  /** Another agency named in this answer. */
  | { kind: "agent"; text: string }
  /** A numbered citation marker, e.g. [2], with its URL when known. */
  | { kind: "cite"; n: number; url: string | null }
  /** An inline source link, e.g. "([rightmove.co.uk](https://…))". */
  | { kind: "source"; label: string; url: string };

export type Block = { kind: "p" | "li" | "h"; inlines: Inline[] };

export interface ParseOptions {
  /** Branch name, aliases, and the exact names the parser matched to the branch. */
  youNames: string[];
  /** Other agency names as written in this answer. */
  agentNames: string[];
  /** Cited URLs in the order the engine returned them ([1] is the first). */
  citedUrls?: string[];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Split one line of text into inline segments: sources, citation markers, then names. */
function inlines(line: string, nameRe: RegExp | null, youSet: Set<string>, citedUrls: string[]): Inline[] {
  const out: Inline[] = [];
  // Sources and markers first, so names inside link labels aren't split.
  const token = /\(\[([^\]]+)\]\(([^)\s]+)\)\)|\[([^\]]+)\]\(([^)\s]+)\)|\[(\d{1,3})\]|【(\d{1,3})】/g;
  let last = 0;
  for (let m = token.exec(line); m; m = token.exec(line)) {
    if (m.index > last) out.push(...names(line.slice(last, m.index), nameRe, youSet));
    if (m[1] && m[2]) out.push({ kind: "source", label: m[1], url: m[2] });
    else if (m[3] && m[4]) out.push(...names(m[3], nameRe, youSet)); // plain link: keep its text
    else {
      const n = Number(m[5] ?? m[6]);
      out.push({ kind: "cite", n, url: citedUrls[n - 1] ?? null });
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(...names(line.slice(last), nameRe, youSet));
  return merge(out);
}

function names(text: string, nameRe: RegExp | null, youSet: Set<string>): Inline[] {
  if (!text) return [];
  if (!nameRe) return [{ kind: "text", text }];
  const out: Inline[] = [];
  let last = 0;
  nameRe.lastIndex = 0;
  for (let m = nameRe.exec(text); m; m = nameRe.exec(text)) {
    if (!m[0]) {
      nameRe.lastIndex++;
      continue;
    }
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: youSet.has(m[0].toLowerCase()) ? "you" : "agent", text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** Join adjacent text segments. */
function merge(xs: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const x of xs) {
    const prev = out[out.length - 1];
    if (x.kind === "text" && prev?.kind === "text") prev.text += x.text;
    else out.push({ ...x });
  }
  return out;
}

function stripEmphasis(s: string): string {
  return s
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1");
}

export function parseAnswer(md: string | null | undefined, opts: ParseOptions): Block[] {
  if (!md) return [];
  const you = [...new Set(opts.youNames.map((n) => n.trim()).filter((n) => n.length >= 2))];
  const agents = [...new Set(opts.agentNames.map((n) => n.trim()).filter((n) => n.length >= 2))];
  const youSet = new Set(you.map((n) => n.toLowerCase()));
  // Longest first so "Fox & Sons Southsea" wins over "Fox & Sons".
  const all = [...you, ...agents.filter((a) => !youSet.has(a.toLowerCase()))].sort((a, b) => b.length - a.length);
  const nameRe = all.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${all.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu") : null;
  const cited = opts.citedUrls ?? [];

  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", inlines: inlines(stripEmphasis(para.join(" ")), nameRe, youSet, cited) });
    para = [];
  };
  for (const raw of md.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) {
      flush();
      continue;
    }
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const bullet = line.match(/^(?:[-*+•]|\d{1,2}[.)])\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: "h", inlines: inlines(stripEmphasis(heading[1]!), nameRe, youSet, cited) });
    } else if (bullet) {
      flush();
      blocks.push({ kind: "li", inlines: inlines(stripEmphasis(bullet[1]!), nameRe, youSet, cited) });
    } else if (/^\*\*[^*]+\*\*:?$/.test(line)) {
      // A bold line on its own reads as a heading.
      flush();
      blocks.push({ kind: "h", inlines: inlines(stripEmphasis(line), nameRe, youSet, cited) });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks.filter((b) => b.inlines.length);
}

function inlineLength(x: Inline): number {
  return x.kind === "cite" ? 3 : x.kind === "source" ? x.label.length + 2 : x.text.length;
}

/** First ~`max` characters of blocks, cut at a word boundary inside the last block. */
export function truncateBlocks(blocks: Block[], max: number): { blocks: Block[]; truncated: boolean } {
  const out: Block[] = [];
  let used = 0;
  for (const b of blocks) {
    const len = b.inlines.reduce((n, x) => n + inlineLength(x), 0);
    if (used + len <= max) {
      out.push(b);
      used += len;
      continue;
    }
    const room = max - used;
    if (room < 40) return { blocks: out, truncated: true };
    const cut: Inline[] = [];
    let left = room;
    for (const x of b.inlines) {
      const l = inlineLength(x);
      if (l <= left) {
        cut.push(x);
        left -= l;
        continue;
      }
      if (x.kind === "text") {
        const slice = x.text.slice(0, left);
        const sp = slice.lastIndexOf(" ");
        cut.push({ kind: "text", text: `${(sp > 20 ? slice.slice(0, sp) : slice).trimEnd()}…` });
      } else cut.push({ kind: "text", text: "…" });
      break;
    }
    out.push({ kind: b.kind, inlines: cut });
    return { blocks: out, truncated: true };
  }
  return { blocks: out, truncated: false };
}

/** Plain text of blocks, for "Copy answer". */
export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      const t = b.inlines
        .map((x) => (x.kind === "cite" ? `[${x.n}]` : x.kind === "source" ? `(${x.label})` : x.text))
        .join("")
        .trim();
      return b.kind === "li" ? `• ${t}` : t;
    })
    .join("\n");
}

/** Unique source domains, in first-cited order. */
export function sourceDomains(urls: string[]): { domain: string; url: string }[] {
  const seen = new Set<string>();
  const out: { domain: string; url: string }[] = [];
  for (const url of urls) {
    let domain: string;
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (seen.has(domain)) continue;
    seen.add(domain);
    out.push({ domain, url });
  }
  return out;
}

export interface RunOutcome {
  runIndex: number;
  /** true named you, false didn't, null not read (excluded from the count). */
  named: boolean | null;
}

/** Group results into "same question + engine in the same scan" run strips. */
export function runStrips(
  rows: { scan_run_id: string; prompt_text: string; engine: string; run_index: number; parse_status: string; mentioned: boolean | null }[],
): Map<string, RunOutcome[]> {
  const out = new Map<string, RunOutcome[]>();
  for (const r of rows) {
    const key = runKey(r.scan_run_id, r.prompt_text, r.engine);
    const list = out.get(key) ?? [];
    list.push({ runIndex: r.run_index, named: r.parse_status === "ok" ? !!r.mentioned : null });
    out.set(key, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.runIndex - b.runIndex);
  return out;
}

export function runKey(runId: string, prompt: string, engine: string): string {
  return `${runId}|${engine}|${prompt}`;
}

/** Cell shade for the question × engine grid: one hue, darker = named more often. */
export function heatStep(pct: number | null): 0 | 1 | 2 | 3 | 4 | 5 | null {
  if (pct === null) return null;
  if (pct <= 0) return 0;
  if (pct < 20) return 1;
  if (pct < 40) return 2;
  if (pct < 60) return 3;
  if (pct < 80) return 4;
  return 5;
}
