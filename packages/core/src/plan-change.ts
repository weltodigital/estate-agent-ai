// What a plan limits a branch to, and what changes when the plan changes.
// The worker uses trackedPrompts to decide what a scan asks; the web app uses
// the same function to show customers what a switch would change, so the two
// can never disagree.

import type { EngineId } from "./config/engines";
import type { PlanLimits } from "./config/plans";

export interface PlanPrompt {
  id: string;
  text: string;
  area: string | null;
  active: boolean;
}

export interface PlanBranch {
  id: string;
  name: string;
  areas: string[];
  /** In created_at order, oldest first. */
  prompts: PlanPrompt[];
}

const norm = (s: string) => s.trim().toLowerCase();

/** The neighbourhoods a plan covers: the first maxAreas in the branch's list. */
export function trackedAreas(areas: string[], limits: Pick<PlanLimits, "maxAreas">): { kept: string[]; dropped: string[] } {
  return { kept: areas.slice(0, limits.maxAreas), dropped: areas.slice(limits.maxAreas) };
}

/**
 * The questions a scan asks: active ones, minus those about neighbourhoods
 * beyond the plan's limit, capped at promptsPerBranch (oldest first).
 */
export function trackedPrompts<P extends Pick<PlanPrompt, "area" | "active">>(
  prompts: P[],
  areas: string[],
  limits: Pick<PlanLimits, "maxAreas" | "promptsPerBranch">,
): { asked: P[]; overArea: P[]; overCount: P[] } {
  const dropped = new Set(trackedAreas(areas, limits).dropped.map(norm));
  const active = prompts.filter((p) => p.active);
  const overArea = active.filter((p) => p.area && dropped.has(norm(p.area)));
  const inArea = active.filter((p) => !(p.area && dropped.has(norm(p.area))));
  return { asked: inArea.slice(0, limits.promptsPerBranch), overArea, overCount: inArea.slice(limits.promptsPerBranch) };
}

export interface BranchChange {
  id: string;
  name: string;
  areasDropped: string[];
  areasKept: string[];
  /** Questions asked now that would stop being asked. */
  promptsDropped: { text: string; reason: "area" | "count" }[];
  /** Questions not asked now that would start being asked again. */
  promptsResumed: number;
}

export interface PlanChangeImpact {
  enginesLost: EngineId[];
  enginesGained: EngineId[];
  promptsPerBranch: { from: number; to: number };
  maxAreas: { from: number; to: number };
  manualScans: { from: number; to: number };
  /** Branches still scanned after the change (oldest first). */
  branchesKept: { id: string; name: string }[];
  /** Branches that stop being scanned. Their results stay viewable. */
  branchesStopped: { id: string; name: string }[];
  /** Kept branches whose questions or neighbourhoods change. */
  branches: BranchChange[];
  /** True when the switch takes something away. */
  losesSomething: boolean;
}

/**
 * Compares what each branch gets now with what it would get on `to`.
 * `branches` are the organisation's active branches, oldest first, which is
 * the order the scheduler keeps them in.
 */
export function planChangeImpact(from: PlanLimits, to: PlanLimits, branches: PlanBranch[]): PlanChangeImpact {
  const enginesLost = from.engines.filter((e) => !to.engines.includes(e));
  const enginesGained = to.engines.filter((e) => !from.engines.includes(e));
  const nowScanned = branches.slice(0, from.maxBranches);
  const kept = branches.slice(0, to.maxBranches);
  const stopped = nowScanned.slice(to.maxBranches);

  const changes: BranchChange[] = kept.map((b) => {
    const before = trackedPrompts(b.prompts, b.areas, from);
    const after = trackedPrompts(b.prompts, b.areas, to);
    const afterIds = new Set(after.asked);
    const beforeIds = new Set(before.asked);
    const overArea = new Set(after.overArea);
    const areas = trackedAreas(b.areas, to);
    const areasBefore = trackedAreas(b.areas, from);
    return {
      id: b.id,
      name: b.name,
      areasKept: areas.kept,
      areasDropped: areas.dropped.filter((a) => areasBefore.kept.includes(a)),
      promptsDropped: before.asked
        .filter((p) => !afterIds.has(p))
        .map((p) => ({ text: (p as PlanPrompt).text, reason: overArea.has(p) ? ("area" as const) : ("count" as const) })),
      promptsResumed: after.asked.filter((p) => !beforeIds.has(p)).length,
    };
  });

  const branchesChanged = changes.filter((c) => c.areasDropped.length || c.promptsDropped.length || c.promptsResumed);
  return {
    enginesLost,
    enginesGained,
    promptsPerBranch: { from: from.promptsPerBranch, to: to.promptsPerBranch },
    maxAreas: { from: from.maxAreas, to: to.maxAreas },
    manualScans: { from: from.manualScansPerMonth, to: to.manualScansPerMonth },
    branchesKept: kept.map(({ id, name }) => ({ id, name })),
    branchesStopped: stopped.map(({ id, name }) => ({ id, name })),
    branches: branchesChanged,
    losesSomething:
      enginesLost.length > 0 ||
      stopped.length > 0 ||
      to.manualScansPerMonth < from.manualScansPerMonth ||
      changes.some((c) => c.areasDropped.length || c.promptsDropped.length),
  };
}
