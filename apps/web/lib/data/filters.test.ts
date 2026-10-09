import { describe, expect, it } from "vitest";
import { filterQuery, metricFilter, parseFilters } from "./filters";

const now = new Date("2026-10-08T12:00:00Z");

describe("parseFilters", () => {
  it("defaults to 30 days, all engines and intents", () => {
    const f = parseFilters({}, now);
    expect(f).toMatchObject({ engine: null, intent: null, days: 30, to: now.toISOString() });
    expect(f.from).toBe("2026-09-08T12:00:00.000Z");
    expect(f.prevFrom).toBe("2026-08-09T12:00:00.000Z");
  });
  it("accepts valid values and rejects junk", () => {
    expect(parseFilters({ engine: "gemini", intent: "letting", days: "7" }, now)).toMatchObject({ engine: "gemini", intent: "letting", days: 7 });
    expect(parseFilters({ engine: "bing", intent: "x", days: "12" }, now)).toMatchObject({ engine: null, intent: null, days: 30 });
  });
  it("builds current and previous metric filters", () => {
    const f = parseFilters({ engine: "openai" }, now);
    expect(metricFilter(f)).toMatchObject({ engines: ["openai"], from: f.from, to: f.to });
    expect(metricFilter(f, "previous")).toMatchObject({ from: f.prevFrom, to: f.from });
  });
  it("builds query strings", () => {
    expect(filterQuery({ engine: "openai", intent: null, days: 7 }, { mentioned: "yes" })).toBe("?engine=openai&days=7&mentioned=yes");
    expect(filterQuery({ engine: "openai", intent: null, days: 7 }, { engine: null })).toBe("?days=7");
  });
});
