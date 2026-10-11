// "What changed": differences between the last two completed scans, in plain
// English. Pure, so it's tested; the loader lives in changes-loader.ts.

import { engineLabel } from "@privett/core";

export interface RunAnswer {
  engine: string;
  prompt: string;
  /** False when the answer couldn't be read: excluded, never counted as "not named". */
  parsed: boolean;
  /** The branch is named (high confidence). */
  named: boolean;
  /** Competitor ids named (high confidence). */
  competitorIds: string[];
}

export interface ChangeInput {
  latest: { startedAt: string; answers: RunAnswer[] };
  previous: { startedAt: string; answers: RunAnswer[] } | null;
  competitors: { id: string; name: string; firstSeenAt: string }[];
  fixesResolved: { id: string; title: string; verifiedAt: string }[];
}

export type ChangeKind = "fix_resolved" | "newly_named" | "new_competitor" | "dropped";

export interface Change {
  kind: ChangeKind;
  text: string;
  /** Good news, bad news, or neither: drives the ▲ / ▼ marker. */
  tone: "up" | "down" | "neutral";
}

const ORDER: ChangeKind[] = ["fix_resolved", "newly_named", "new_competitor", "dropped"];

function byQuestionEngine(answers: RunAnswer[]) {
  const map = new Map<string, { engine: string; prompt: string; named: number; parsed: number }>();
  for (const a of answers) {
    if (!a.parsed) continue;
    const k = `${a.engine}|${a.prompt}`;
    const e = map.get(k) ?? { engine: a.engine, prompt: a.prompt, named: 0, parsed: 0 };
    e.parsed++;
    if (a.named) e.named++;
    map.set(k, e);
  }
  return map;
}

export function computeChanges(input: ChangeInput, max = 5): Change[] {
  if (!input.previous) return [];
  const out: Change[] = [];

  for (const f of input.fixesResolved) {
    if (f.verifiedAt >= input.latest.startedAt) {
      out.push({ kind: "fix_resolved", tone: "up", text: `Fix confirmed: ${lowerFirst(f.title)}` });
    }
  }

  const now = byQuestionEngine(input.latest.answers);
  const before = byQuestionEngine(input.previous.answers);
  for (const [k, cur] of now) {
    const prev = before.get(k);
    if (!prev) continue; // only compare questions asked on that engine in both scans
    const engine = engineLabel(cur.engine);
    if (prev.named === 0 && cur.named > 0) {
      out.push({ kind: "newly_named", tone: "up", text: `${engine} named you for “${cur.prompt}”` });
    } else if (prev.named > 0 && cur.named === 0) {
      out.push({ kind: "dropped", tone: "down", text: `${engine} stopped naming you for “${cur.prompt}”` });
    }
  }

  for (const c of input.competitors) {
    if (c.firstSeenAt < input.latest.startedAt) continue;
    const count = input.latest.answers.filter((a) => a.parsed && a.competitorIds.includes(c.id)).length;
    if (count >= 3) out.push({ kind: "new_competitor", tone: "neutral", text: `${c.name} appeared in ${count} answers, new this scan` });
  }

  return out.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).slice(0, max);
}

function lowerFirst(s: string): string {
  return s ? s[0]!.toLowerCase() + s.slice(1) : s;
}
