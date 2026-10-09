import { describe, expect, it } from "vitest";
import { countBy, extractSnippet, referralsByWeek } from "./aggregate";

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
