import { describe, expect, it } from "vitest";
import { buildTicker, estimateEtaSeconds, etaLabel, isFinished, perEngineProgress } from "./scan-progress";

describe("scan progress helpers", () => {
  it("splits the run total across engines", () => {
    const rows = perEngineProgress(["openai", "perplexity"], 10, new Map([["openai", 3]]));
    expect(rows).toEqual([
      { engine: "openai", label: "ChatGPT", done: 3, total: 5 },
      { engine: "perplexity", label: "Perplexity", done: 0, total: 5 },
    ]);
  });

  it("estimates time left from the measured pace", () => {
    const now = Date.parse("2026-10-11T10:01:00Z");
    // 20 answers in 60s -> 3s each, 40 left -> 120s
    expect(estimateEtaSeconds({ done: 20, total: 60, startedAt: "2026-10-11T10:00:00Z", now })).toBe(120);
    expect(estimateEtaSeconds({ done: 0, total: 10, startedAt: null, now })).toBe(40);
    expect(estimateEtaSeconds({ done: 10, total: 10, startedAt: null, now })).toBe(0);
    expect(estimateEtaSeconds({ done: 0, total: 0, startedAt: null, now })).toBeNull();
  });

  it("labels time left in plain words", () => {
    expect(etaLabel(30)).toBe("Less than a minute left");
    expect(etaLabel(65)).toBe("About 1 minute left");
    expect(etaLabel(150)).toBe("About 3 minutes left");
    expect(etaLabel(null)).toBeNull();
  });

  it("shapes the ticker newest first, names in answer order", () => {
    const lines = buildTicker(
      [
        { id: "a", engine: "openai", created_at: "2026-10-11T10:00:00Z" },
        { id: "b", engine: "perplexity", created_at: "2026-10-11T10:00:05Z" },
        { id: "c", engine: "openai", created_at: "2026-10-11T10:00:09Z" },
      ],
      [
        { scan_result_id: "a", agent_name: "Fox", position: 2, is_branch: false, match_confidence: "high" },
        { scan_result_id: "a", agent_name: "You Ltd", position: 1, is_branch: true, match_confidence: "high" },
        { scan_result_id: "b", agent_name: "Hunters", position: 1, is_branch: false, match_confidence: "none" },
        { scan_result_id: "b", agent_name: "Maybe You", position: 2, is_branch: true, match_confidence: "low" },
      ],
    );
    expect(lines.map((l) => l.id)).toEqual(["b", "a"]); // c named nobody
    expect(lines[1]!.names).toEqual([
      { name: "You Ltd", isBranch: true },
      { name: "Fox", isBranch: false },
    ]);
    expect(lines[0]!.names[1]).toEqual({ name: "Maybe You", isBranch: false }); // low confidence isn't "you"
  });

  it("knows finished statuses", () => {
    expect(isFinished("completed")).toBe(true);
    expect(isFinished("running")).toBe(false);
  });
});
