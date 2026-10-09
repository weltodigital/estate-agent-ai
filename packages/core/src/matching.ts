// Entity matching: decide whether an agent named in an AI answer is the
// tracked branch, a known competitor, or someone new.
//
// We never guess. Exact normalised name/alias or domain match = high
// confidence. Partial token overlap = low confidence, which is stored and
// flagged for review rather than counted as a mention.

import { domainMatches, normaliseAgentName, normaliseDomain } from "./text";

export type MatchConfidence = "high" | "low" | "none";

export interface MatchTarget {
  /** "branch", a competitor id, or a league agent id. */
  key: string;
  name: string;
  aliases: string[];
  domain: string | null;
}

export interface MatchResult {
  key: string | null;
  confidence: MatchConfidence;
  reason: string;
}

function tokens(s: string): string[] {
  return s.split(" ").filter((t) => t.length > 1);
}

export function matchAgent(
  agent: { name: string; domain?: string | null },
  targets: MatchTarget[],
  /** Town and area names to ignore, so "Hunters Stourbridge" matches "Hunters". */
  places: string[] = [],
): MatchResult {
  const normalise = (n: string) => normaliseAgentName(n, places);
  const norm = normalise(agent.name);
  const agentDomain = normaliseDomain(agent.domain ?? null);

  for (const t of targets) {
    if (agentDomain && t.domain && domainMatches(agentDomain, t.domain)) {
      return { key: t.key, confidence: "high", reason: `domain ${agentDomain}` };
    }
  }
  for (const t of targets) {
    const names = [t.name, ...t.aliases].map(normalise).filter(Boolean);
    if (names.includes(norm)) return { key: t.key, confidence: "high", reason: `name "${norm}"` };
  }

  // Low confidence: every token of one name appears in the other, e.g.
  // "Fox" vs "Fox Southsea". Common for branch suffixes, but also for
  // unrelated agencies sharing a surname, hence review rather than accept.
  const normTokens = tokens(norm);
  let best: MatchResult = { key: null, confidence: "none", reason: "no match" };
  for (const t of targets) {
    for (const n of [t.name, ...t.aliases].map(normalise)) {
      const nt = tokens(n);
      if (!nt.length || !normTokens.length) continue;
      const aInB = nt.every((x) => normTokens.includes(x));
      const bInA = normTokens.every((x) => nt.includes(x));
      if (aInB || bInA) {
        best = { key: t.key, confidence: "low", reason: `partial "${norm}" ~ "${n}"` };
      }
    }
  }
  return best;
}

/** Does a cited URL belong to the target? Domain match only. */
export function citationBelongsTo(url: string, target: { domain: string | null }): boolean {
  return domainMatches(normaliseDomain(url), target.domain);
}
