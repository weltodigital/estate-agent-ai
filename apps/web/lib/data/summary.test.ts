import { describe, expect, it } from "vitest";
import type { MetricResponse } from "@privett/core";
import { buildSummary, firstSentence, ordinal, outOfTen } from "./summary";

const resp = (id: string, engine: string, prompt: string, agents: [string | null, string, number][], createdAt = "2026-10-08T10:00:00Z"): MetricResponse => ({
  id,
  engine,
  intentGroup: "selling",
  createdAt,
  promptText: prompt,
  parsed: true,
  agents: agents.map(([key, name, position]) => ({ subjectKey: key, normalisedName: name, position, sentimentScore: 70, descriptors: key === "branch" ? ["independent"] : [], confidence: key ? "high" : "none" })),
});

describe("summary helpers", () => {
  it("formats out of ten and ordinals", () => {
    expect(outOfTen(39)).toBe(4);
    expect(outOfTen(3)).toBe(1);
    expect(outOfTen(0)).toBe(0);
    expect(outOfTen(null)).toBeNull();
    expect([1, 2, 3, 4, 11, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "22nd"]);
    expect(firstSentence("AI cited Zoopla in 37 answers. None were about you.")).toBe("AI cited Zoopla in 37 answers.");
  });

  it("builds the overview from the same responses as the evidence", () => {
    const responses = [
      resp("1", "openai", "best agent", [["branch", "keats", 2], ["w", "winkworth", 1]]),
      resp("2", "openai", "best agent", [["w", "winkworth", 1]]),
      resp("3", "anthropic", "best agent", [["branch", "keats", 1]]),
      resp("4", "openai", "valuations", [["w", "winkworth", 1]]),
      resp("5", "openai", "valuations", [["w", "winkworth", 1]]),
      resp("6", "openai", "valuations", [["w", "winkworth", 1]]),
      resp("old", "openai", "best agent", [["w", "winkworth", 1]], "2026-08-20T10:00:00Z"),
    ];
    const s = buildSummary({
      responses,
      competitors: [{ id: "w", name: "Winkworth" }],
      from: "2026-09-09T00:00:00Z",
      prevFrom: "2026-08-10T00:00:00Z",
      lowSampleThreshold: 2,
    });
    expect(s.answers).toBe(6);
    expect(s.visibility).toBeCloseTo(100 / 3);
    expect(s.previousVisibility).toBe(0);
    expect(s.usualPlace).toBe(2); // mean 1.5 rounds to 2
    expect(s.ranking[0]).toMatchObject({ name: "Winkworth", isYou: false });
    expect(s.ranking.find((r) => r.isYou)?.visibility).toBeCloseTo(100 / 3);
    expect(s.missing[0]).toEqual({ prompt: "valuations", named: 0, of: 3 });
    expect(s.byEngine.find((e) => e.engine === "anthropic")?.visibility).toBe(100);
    expect(s.describedAs).toEqual(["independent"]);
  });
});
