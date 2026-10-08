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

/**
 * Render the library for a branch. Town templates once; area templates once
 * per area. Ordered so the most important prompts survive the plan cap:
 * one of each intent first, then the rest round-robin.
 */
export function renderPromptsForBranch(
  library: PromptTemplate[],
  branch: { town: string; areas: string[] },
  limit: number,
): RenderedPrompt[] {
  const rendered: RenderedPrompt[] = [];
  const sorted = [...library].sort((a, b) => a.sort_order - b.sort_order);
  for (const t of sorted) {
    if (t.uses_area) {
      for (const area of branch.areas) {
        rendered.push({
          prompt_id: t.id,
          text: t.template.replaceAll("{area}", area).replaceAll("{town}", branch.town),
          intent_group: t.intent_group,
          area,
        });
      }
    } else {
      rendered.push({
        prompt_id: t.id,
        text: t.template.replaceAll("{town}", branch.town),
        intent_group: t.intent_group,
        area: null,
      });
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
