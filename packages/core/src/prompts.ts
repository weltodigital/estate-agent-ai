import type { IntentGroup } from "./domain";

export interface PromptTemplate {
  id: string;
  template: string;
  intent_group: IntentGroup;
  uses_area: boolean;
  sort_order: number;
}

export interface RenderedPrompt {
  prompt_id: string;
  text: string;
  intent_group: IntentGroup;
  area: string | null;
}

export interface PromptPlace {
  town: string;
  areas: string[];
  /** Set only when another UK town or village shares the town's name. */
  county?: string | null;
}

/**
 * Small places share names across the country, so questions name enough to
 * pin the place down. A town that shares its name gets its county ("best
 * estate agent in Newport, Isle of Wight"); an area always gets its town
 * ("best estate agent in Drayton, Portsmouth"). Templates that already name
 * the town are left as written.
 */
export function renderPromptText(template: string, area: string | null, place: Pick<PromptPlace, "town" | "county">): string {
  const town = place.town;
  if (area === null) return template.replaceAll("{town}", place.county ? `${town}, ${place.county}` : town);
  const sameAsTown = area.trim().toLowerCase() === town.trim().toLowerCase();
  const areaText = template.includes("{town}") || sameAsTown ? area : `${area}, ${town}`;
  return template.replaceAll("{area}", areaText).replaceAll("{town}", town);
}

/**
 * Render the library for a branch. Town templates once; area templates once
 * per area. Ordered so the most important prompts survive the plan cap:
 * one of each intent first, then the rest round-robin.
 */
export function renderPromptsForBranch(library: PromptTemplate[], branch: PromptPlace, limit: number): RenderedPrompt[] {
  const rendered: RenderedPrompt[] = [];
  const sorted = [...library].sort((a, b) => a.sort_order - b.sort_order);
  for (const t of sorted) {
    for (const area of t.uses_area ? branch.areas : [null]) {
      rendered.push({ prompt_id: t.id, text: renderPromptText(t.template, area, branch), intent_group: t.intent_group, area });
    }
  }

  // Round-robin across intent groups so a cap keeps coverage balanced.
  const byGroup = new Map<IntentGroup, RenderedPrompt[]>();
  for (const p of rendered) {
    const list = byGroup.get(p.intent_group) ?? [];
    list.push(p);
    byGroup.set(p.intent_group, list);
  }
  const out: RenderedPrompt[] = [];
  const seen = new Set<string>();
  while (out.length < limit && [...byGroup.values()].some((l) => l.length)) {
    for (const list of byGroup.values()) {
      const next = list.shift();
      if (!next || out.length >= limit) continue;
      const key = next.text.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(next);
    }
  }
  return out;
}
