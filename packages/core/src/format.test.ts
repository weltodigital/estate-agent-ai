import { describe, expect, it } from "vitest";
import { fmtDate, fmtNum, fmtPct, fmtPos, fmtPts, fmtRelative } from "./format";

describe("format", () => {
  it("never shows NaN, null or undefined", () => {
    for (const v of [null, undefined, NaN, Infinity]) {
      expect(fmtPct(v)).toBe("—");
      expect(fmtPos(v)).toBe("—");
      expect(fmtPts(v)).toBe("—");
      expect(fmtNum(v)).toBe("—");
    }
    expect(fmtDate("nonsense")).toBe("—");
  });
  it("formats numbers consistently", () => {
    expect(fmtPct(62.4)).toBe("62%");
    expect(fmtPct(4.53)).toBe("4.5%");
    expect(fmtPct(0)).toBe("0%");
    expect(fmtPos(2.44)).toBe("#2.4");
    expect(fmtPts(8)).toBe("+8 pts");
    expect(fmtPts(-3)).toBe("−3 pts");
    expect(fmtPts(-1.25, "")).toBe("−1.3");
  });
  it("formats dates in UK style", () => {
    expect(fmtDate("2026-10-20T08:14:00Z")).toBe("Tue 20 Oct");
    const now = new Date("2026-10-20T12:00:00Z");
    expect(fmtRelative("2026-10-20T11:59:30Z", now)).toBe("just now");
    expect(fmtRelative("2026-10-20T10:00:00Z", now)).toBe("2 hours ago");
    expect(fmtRelative("2026-10-18T12:00:00Z", now)).toBe("2 days ago");
    expect(fmtRelative("2026-10-01T12:00:00Z", now)).toBe("Thu 1 Oct");
  });
});
