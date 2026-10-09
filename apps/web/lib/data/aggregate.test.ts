import { describe, expect, it } from "vitest";
import { citationStats, countBy, extractSnippet, isCitationGap, referralsByWeek } from "./aggregate";

describe("citationStats", () => {
  it("aggregates by domain and spots gaps", () => {
    const stats = citationStats(
      [
        { scanResultId: "r1", domain: "www.allagents.co.uk", isOwnDomain: false, competitorId: null },
        { scanResultId: "r2", domain: "allagents.co.uk", isOwnDomain: false, competitorId: "c1" },
        { scanResultId: "r2", domain: "allagents.co.uk", isOwnDomain: false, competitorId: "c1" },
        { scanResultId: "r3", domain: "me.co.uk", isOwnDomain: true, competitorId: null },
      ],
      new Map([
        ["r1", { branch: false, competitorIds: ["c2"] }],
        ["r3", { branch: true, competitorIds: [] }],
      ]),
    );
    expect(stats[0]).toMatchObject({ domain: "allagents.co.uk", responses: 2, citesBranch: false });
    expect(stats[0]!.competitorIds.sort()).toEqual(["c1", "c2"]);
    expect(isCitationGap(stats[0]!)).toBe(true);
    expect(stats[1]).toMatchObject({ domain: "me.co.uk", citesBranch: true, responsesNamingBranch: 1 });
    expect(isCitationGap(stats[1]!)).toBe(false);
  });
});

describe("extractSnippet", () => {
  it("returns an excerpt around the first match", () => {
    const s = extractSnippet("Lots of agents. **Bernards** are known for being friendly and local. Others exist.", ["bernards"], 8);
    expect(s).toContain("Bernards");
    expect(s?.startsWith("…")).toBe(true);
  });
  it("returns null when nothing matches", () => {
    expect(extractSnippet("nothing here", ["fox"])).toBeNull();
    expect(extractSnippet(null, ["fox"])).toBeNull();
  });
});

describe("referrals", () => {
  it("groups by Monday-start week and source", () => {
    const rows = referralsByWeek([
      { source: "chatgpt", landing_path: "/", ts: "2026-10-05T10:00:00Z" }, // Monday
      { source: "chatgpt", landing_path: "/a", ts: "2026-10-08T10:00:00Z" },
      { source: "perplexity", landing_path: "/", ts: "2026-10-04T10:00:00Z" }, // Sunday, previous week
    ]);
    expect(rows).toEqual([
      { week: "2026-09-28", total: 1, perplexity: 1 },
      { week: "2026-10-05", total: 2, chatgpt: 2 },
    ]);
  });
  it("counts by key", () => {
    expect(countBy(["a", "b", "a"], (x) => x)).toEqual([{ key: "a", count: 2 }, { key: "b", count: 1 }]);
  });
});
