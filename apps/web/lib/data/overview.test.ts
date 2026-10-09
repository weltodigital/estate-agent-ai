import { describe, expect, it } from "vitest";
import type { MetricResponse } from "@privett/core";
import { buildCards, isImprovement, perEngine, trendSeries } from "./overview";

const r = (id: string, createdAt: string, engine: string, agents: [string | null, string, number][]): MetricResponse => ({
  id,
  engine,
  intentGroup: "selling",
  createdAt,
  promptText: "best estate agent in Portsmouth",
  parsed: true,
  agents: agents.map(([subjectKey, normalisedName, position]) => ({
    subjectKey,
    normalisedName,
    position,
    sentimentScore: 70,
    descriptors: [],
    confidence: subjectKey ? "high" : "none",
  })),
});

const responses = [
  r("p1", "2026-09-01T00:00:00Z", "openai", [["c1", "fox", 1]]),
  r("c1", "2026-10-01T00:00:00Z", "openai", [["branch", "me", 1], ["c1", "fox", 2]]),
  r("c2", "2026-10-02T00:00:00Z", "gemini", [["c1", "fox", 1]]),
];

const current = { from: "2026-09-15T00:00:00Z", to: "2026-10-15T00:00:00Z" };
const previous = { from: "2026-08-15T00:00:00Z", to: "2026-09-15T00:00:00Z" };

describe("buildCards", () => {
  it("computes current, previous, change and competitor comparisons", () => {
    const { cards, top } = buildCards({
      responses,
      current,
      previous,
      trendFilter: { from: "2026-08-15T00:00:00Z" },
      competitors: [{ key: "c1", name: "Fox" }, { key: "c9", name: "Never named" }],
      lowSampleThreshold: 20,
    });
    const vis = cards.find((c) => c.key === "visibility")!;
    expect(vis.current).toBe(50);
    expect(vis.previous).toBe(0);
    expect(vis.change).toBe(50);
    expect(vis.metrics.lowSample).toBe(true);
    expect(top.map((t) => t.name)).toEqual(["Fox"]);
    expect(vis.competitors).toEqual([{ name: "Fox", value: 100 }]);
    const pos = cards.find((c) => c.key === "position")!;
    expect(pos.previous).toBeNull();
    expect(pos.change).toBeNull();
  });
});

describe("perEngine and trends", () => {
  it("breaks down by engine", () => {
    const rows = perEngine(responses, current, 20);
    expect(rows.map((x) => [x.engine, x.metrics.visibility])).toEqual([
      ["gemini", 0],
      ["openai", 100],
    ]);
  });
  it("builds weekly series", () => {
    const s = trendSeries(responses, [{ key: "c1", name: "Fox" }], {}, "visibility");
    expect(s[0]).toMatchObject({ week: "2026-08-31", You: 0, Fox: 100 });
  });
  it("treats lower position as better", () => {
    expect(isImprovement("position", -0.5)).toBe(true);
    expect(isImprovement("visibility", -2)).toBe(false);
    expect(isImprovement("visibility", null)).toBeNull();
  });
});
