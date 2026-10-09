import { describe, expect, it } from "vitest";
import { cleanParsed } from "../src/parse";
import { buildCitationStats } from "../src/recommendations";
import { rollupRows } from "../src/rollups";
import { Mutex, runPool } from "../src/util/pool";
import { RateLimiter } from "../src/util/rate-limit";
import { HttpError, withRetry } from "../src/util/retry";
import { toMetricResponses } from "@privett/core";

describe("RateLimiter", () => {
  it("allows a burst then spaces calls at rpm", async () => {
    let t = 0;
    const waits: number[] = [];
    const limiter = new RateLimiter(60, 2, () => t, async (ms) => {
      waits.push(ms);
      t += ms;
    });
    for (let i = 0; i < 4; i++) await limiter.acquire();
    // 2 immediate, then one per second at 60 rpm.
    expect(waits).toEqual([1000, 1000]);
    expect(t).toBe(2000);
  });
});

describe("withRetry", () => {
  it("retries retryable errors only", async () => {
    let n = 0;
    const v = await withRetry(async () => {
      if (++n < 3) throw new HttpError(503, "x");
      return "ok";
    }, { sleep: async () => {} });
    expect(v).toBe("ok");
    let m = 0;
    await expect(withRetry(async () => { m++; throw new HttpError(401, "no"); }, { sleep: async () => {} })).rejects.toThrow();
    expect(m).toBe(1);
  });
});

describe("pool and mutex", () => {
  it("respects the concurrency limit and stop signal", async () => {
    let inFlight = 0;
    let max = 0;
    const done: number[] = [];
    await runPool([1, 2, 3, 4, 5, 6], 2, async (x) => {
      inFlight++;
      max = Math.max(max, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      done.push(x);
    }, () => done.length >= 3);
    expect(max).toBe(2);
    expect(done.length).toBeLessThan(6);
  });
  it("serialises sections", async () => {
    const m = new Mutex();
    const order: string[] = [];
    await Promise.all([
      m.run(async () => { order.push("a1"); await new Promise((r) => setTimeout(r, 5)); order.push("a2"); }),
      m.run(async () => { order.push("b1"); }),
    ]);
    expect(order).toEqual(["a1", "a2", "b1"]);
  });
});

describe("cleanParsed", () => {
  it("renumbers, clamps, de-duplicates and caps descriptors", () => {
    const out = cleanParsed({
      notes: null,
      agents: [
        { name: "Fox & Sons", position: 3, domain: " ", sentiment_label: "positive", sentiment_score: 140, descriptors: ["a", "b", "c", "d", "e", "f", "a"] },
        { name: "Bernards", position: 1, domain: "bernardsea.co.uk", sentiment_label: "neutral", sentiment_score: -5, descriptors: [] },
        { name: "Fox and Sons Estate Agents", position: 5, domain: null, sentiment_label: "neutral", sentiment_score: 50, descriptors: [] },
        { name: "  ", position: 2, domain: null, sentiment_label: "neutral", sentiment_score: 50, descriptors: [] },
      ],
    });
    expect(out.agents.map((a) => [a.name, a.position, a.sentiment_score])).toEqual([
      ["Bernards", 1, 0],
      ["Fox & Sons", 2, 100],
    ]);
    expect(out.agents[1]!.descriptors).toEqual(["a", "b", "c", "d", "e"]);
    expect(out.agents[1]!.domain).toBeNull();
  });
});

const results = [
  { id: "r1", engine: "openai", intent_group: "selling", created_at: "2026-10-05T10:00:00Z", prompt_text: "p1", parse_status: "ok", branch_prompt_id: null },
  { id: "r2", engine: "gemini", intent_group: "letting", created_at: "2026-10-05T10:00:00Z", prompt_text: "p2", parse_status: "ok", branch_prompt_id: null },
  { id: "r3", engine: "gemini", intent_group: "letting", created_at: "2026-10-05T10:00:00Z", prompt_text: "p2", parse_status: "failed", branch_prompt_id: null },
];
const mention = (scan_result_id: string, is_branch: boolean, comp: string | null, position: number) => ({
  scan_result_id, agent_name: comp ?? "Branch", normalised_name: comp ?? "branch", position, is_branch,
  matched_competitor_id: comp, matched_league_agent_id: null, match_confidence: "high", sentiment_score: 70, descriptors: [],
});
const mentions = [mention("r1", true, null, 1), mention("r1", false, "c1", 2), mention("r2", false, "c1", 1)];

describe("rollupRows", () => {
  it("writes engine x intent rows only where there are responses", () => {
    const rows = rollupRows(toMetricResponses(results, mentions), [{ kind: "branch", key: "branch", id: "b" }, { kind: "competitor", key: "c1", id: "c1" }], { org_id: "o", branch_id: "b", week_start: "2026-10-05" });
    const all = rows.find((r) => r.engine === "all" && r.intent_group === "all" && r.subject_id === "b")!;
    expect(all).toMatchObject({ responses: 2, mentions: 1, visibility: 50, avg_position: 1 });
    expect(rows.find((r) => r.engine === "openai" && r.intent_group === "letting")).toBeUndefined();
    expect(rows.find((r) => r.engine === "gemini" && r.intent_group === "letting" && r.subject_id === "c1")).toMatchObject({ visibility: 100 });
  });
});

describe("buildCitationStats", () => {
  const cite = (scan_result_id: string, url: string, is_own_domain = false) => ({
    scan_result_id,
    url,
    domain: new URL(url).hostname.replace(/^www\./, ""),
    is_own_domain,
    competitor_id: null,
  });
  const run = (rows: ReturnType<typeof cite>[]) =>
    buildCitationStats(results, mentions, rows, new Map([["c1", "Fox"]]), ["privett test"], [{ id: "c1", normalisedName: "fox", domain: null }], "branch.co.uk");

  it("credits the branch only for pages about it, not for sharing an answer", () => {
    // r1 names the branch, but the cited directory page is the town listing.
    const stats = run([
      cite("r1", "https://www.allagents.co.uk/estate-agents/portsmouth/"),
      cite("r2", "https://www.allagents.co.uk/fox-estate-agents/"),
      cite("r1", "https://branch.co.uk/", true),
    ]);
    expect(stats).toEqual([{ domain: "allagents.co.uk", responses: 2, citesBranch: false, competitorsCited: ["Fox"] }]);
  });

  it("recognises the branch's own profile page", () => {
    const stats = run([cite("r1", "https://www.getagent.co.uk/agents/privett-test-portsmouth")]);
    expect(stats[0]).toMatchObject({ citesBranch: true });
  });
});
