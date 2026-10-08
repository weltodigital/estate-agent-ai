import { describe, expect, it } from "vitest";
import { computeSubjectMetrics, type MetricResponse, type ResponseAgent } from "./metrics";

const agent = (subjectKey: string | null, name: string, position: number, sentimentScore: number | null = 70): ResponseAgent => ({
  subjectKey,
  normalisedName: name,
  position,
  sentimentScore,
  descriptors: subjectKey === "branch" ? ["friendly"] : [],
  confidence: subjectKey ? "high" : "none",
});

const resp = (id: string, agents: ResponseAgent[], extra: Partial<MetricResponse> = {}): MetricResponse => ({
  id,
  engine: "openai",
  intentGroup: "selling",
  createdAt: "2026-10-01T10:00:00Z",
  promptText: "best estate agent in Portsmouth",
  parsed: true,
  agents,
  ...extra,
});

describe("computeSubjectMetrics", () => {
  const responses = [
    resp("1", [agent("c1", "fox", 1), agent("branch", "privett", 2, 80)]),
    resp("2", [agent("branch", "privett", 1, 60), agent("c1", "fox", 2), agent(null, "other", 3)]),
    resp("3", [agent("c1", "fox", 1)]),
    resp("4", [], { parsed: false }), // excluded from every denominator
  ];

  it("computes the four headline metrics per the spec", () => {
    const m = computeSubjectMetrics(responses, "branch");
    expect(m.responses).toBe(3);
    expect(m.mentions).toBe(2);
    expect(m.visibility).toBeCloseTo((2 / 3) * 100);
    expect(m.position).toBe(1.5);
    expect(m.sentiment).toBe(70);
    // 2 branch mentions / (2 + 3 + 1) total agent mentions
    expect(m.shareOfVoice).toBeCloseTo((2 / 6) * 100);
    expect(m.topDescriptors[0]).toEqual({ descriptor: "friendly", count: 2 });
  });

  it("works for competitors with the same definitions", () => {
    const m = computeSubjectMetrics(responses, "c1");
    expect(m.visibility).toBe(100);
    expect(m.position).toBeCloseTo(4 / 3);
  });

  it("returns nulls, not zeros, with no data", () => {
    const m = computeSubjectMetrics([], "branch");
    expect(m.visibility).toBeNull();
    expect(m.position).toBeNull();
    expect(m.shareOfVoice).toBeNull();
    expect(m.lowSample).toBe(true);
  });

  it("does not count low-confidence matches as mentions", () => {
    const low = { ...agent("branch", "privett", 1), confidence: "low" as const };
    const m = computeSubjectMetrics([resp("x", [low])], "branch");
    expect(m.mentions).toBe(0);
    expect(m.visibility).toBe(0);
  });

  it("filters by engine", () => {
    const m = computeSubjectMetrics([...responses, resp("5", [agent("branch", "privett", 1)], { engine: "gemini" })], "branch", {
      filter: { engines: ["gemini"] },
    });
    expect(m.responses).toBe(1);
    expect(m.visibility).toBe(100);
  });
});
