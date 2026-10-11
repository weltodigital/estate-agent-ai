import { describe, expect, it } from "vitest";
import { computeChanges, type RunAnswer } from "./changes";

const a = (engine: string, prompt: string, named: boolean, competitorIds: string[] = [], parsed = true): RunAnswer => ({
  engine,
  prompt,
  named,
  competitorIds,
  parsed,
});

describe("computeChanges", () => {
  const previous = {
    startedAt: "2026-10-01T09:00:00Z",
    answers: [a("openai", "best agent", false), a("openai", "valuations", true), a("perplexity", "letting", false)],
  };
  const latest = {
    startedAt: "2026-10-08T09:00:00Z",
    answers: [
      a("openai", "best agent", true, ["b"]),
      a("openai", "valuations", false, ["b"]),
      a("perplexity", "letting", false, [], false), // unreadable: no change claimed
      a("anthropic", "best agent", true, ["b"]), // not asked before on Claude
    ],
  };

  it("reports gains, losses, new competitors and resolved fixes", () => {
    const changes = computeChanges({
      latest,
      previous,
      competitors: [
        { id: "b", name: "Belvoir", firstSeenAt: "2026-10-08T09:05:00Z" },
        { id: "w", name: "Winkworth", firstSeenAt: "2026-09-01T00:00:00Z" },
      ],
      fixesResolved: [{ id: "f", title: "Stop blocking AI crawlers", verifiedAt: "2026-10-08T09:30:00Z" }],
    });
    expect(changes.map((c) => c.kind)).toEqual(["fix_resolved", "newly_named", "new_competitor", "dropped"]);
    expect(changes[1]!.text).toBe("ChatGPT named you for “best agent”");
    expect(changes[2]!.text).toBe("Belvoir appeared in 3 answers, new this scan");
    expect(changes[3]).toMatchObject({ tone: "down", text: "ChatGPT stopped naming you for “valuations”" });
  });

  it("says nothing after a single scan", () => {
    expect(computeChanges({ latest, previous: null, competitors: [], fixesResolved: [] })).toEqual([]);
  });
});
