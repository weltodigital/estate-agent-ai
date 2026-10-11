import { describe, expect, it } from "vitest";
import { freeScanEmailHtml, outOfTen } from "../src/notify";

describe("free scan email", () => {
  it("rounds like the results page", () => {
    expect([0, 3, 37, 60, 100, null].map(outOfTen)).toEqual([0, 1, 4, 6, 10, 0]);
  });
  it("escapes names and links the results", () => {
    const html = freeScanEmailHtml({ agency: "Fox & Sons <x>", town: "Farnham", outOf10: 4, namedInstead: ["Winkworth"], url: "https://www.useprivett.com/free-scan/abc" });
    expect(html).toContain("AI named Fox &amp; Sons &lt;x&gt; in 4 out of 10 answers");
    expect(html).toContain('href="https://www.useprivett.com/free-scan/abc"');
    expect(html).toContain("<strong>Winkworth</strong>");
  });
});
