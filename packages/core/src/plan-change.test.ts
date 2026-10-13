import { describe, expect, it } from "vitest";
import { getPlans } from "./config/plans";
import { planChangeImpact, trackedPrompts, type PlanBranch } from "./plan-change";

const plans = getPlans({});
const withBranches = (id: "starter" | "pro" | "agency", n: number) => ({ ...plans[id].limits, maxBranches: id === "agency" ? n : 1 });

const branch = (id: string, areas: string[], promptAreas: (string | null)[]): PlanBranch => ({
  id,
  name: `Branch ${id}`,
  areas,
  prompts: promptAreas.map((area, i) => ({ id: `${id}-${i}`, text: `q${i}`, area, active: true })),
});

describe("trackedPrompts", () => {
  it("drops questions about neighbourhoods beyond the limit, then caps the count", () => {
    const b = branch("a", ["One", "Two", "Three", "Four"], [null, "One", "four", null, "Two"]);
    const r = trackedPrompts(b.prompts, b.areas, { maxAreas: 3, promptsPerBranch: 3 });
    expect(r.overArea.map((p) => p.id)).toEqual(["a-2"]);
    expect(r.asked.map((p) => p.id)).toEqual(["a-0", "a-1", "a-3"]);
    expect(r.overCount.map((p) => p.id)).toEqual(["a-4"]);
  });

  it("ignores inactive questions", () => {
    const b = branch("a", [], [null, null]);
    b.prompts[0]!.active = false;
    expect(trackedPrompts(b.prompts, b.areas, { maxAreas: 3, promptsPerBranch: 12 }).asked).toHaveLength(1);
  });
});

describe("planChangeImpact", () => {
  it("Pro to Starter loses Claude, extra scans, questions and neighbourhoods", () => {
    const b = branch("a", ["A", "B", "C", "D", "E"], [...Array(14).fill(null), "D", "E", "A", "B"]);
    const r = planChangeImpact(withBranches("pro", 1), withBranches("starter", 1), [b]);
    expect(r.enginesLost).toEqual(["anthropic"]);
    expect(r.manualScans).toEqual({ from: 1, to: 0 });
    expect(r.branches[0]!.areasDropped).toEqual(["D", "E"]);
    expect(r.branches[0]!.promptsDropped.filter((p) => p.reason === "area")).toHaveLength(2);
    // 16 left in area, 12 asked: 4 dropped for count.
    expect(r.branches[0]!.promptsDropped.filter((p) => p.reason === "count")).toHaveLength(4);
    expect(r.losesSomething).toBe(true);
  });

  it("Agency to Pro keeps the oldest branch only", () => {
    const bs = [branch("a", [], [null]), branch("b", [], [null]), branch("c", [], [null])];
    const r = planChangeImpact(withBranches("agency", 3), withBranches("pro", 1), bs);
    expect(r.branchesKept.map((b) => b.id)).toEqual(["a"]);
    expect(r.branchesStopped.map((b) => b.id)).toEqual(["b", "c"]);
  });

  it("an upgrade loses nothing and resumes questions", () => {
    const b = branch("a", [], Array(15).fill(null));
    const r = planChangeImpact(withBranches("starter", 1), withBranches("pro", 1), [b]);
    expect(r.losesSomething).toBe(false);
    expect(r.enginesGained).toEqual(["anthropic"]);
    expect(r.branches[0]!.promptsResumed).toBe(3);
  });
});
