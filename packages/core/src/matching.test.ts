import { describe, expect, it } from "vitest";
import { matchAgent } from "./matching";
import { normaliseAgentName, normaliseDomain } from "./text";

describe("normalise", () => {
  it("strips generic suffixes", () => {
    expect(normaliseAgentName("Fox & Sons Estate Agents Ltd")).toBe("fox sons");
    expect(normaliseAgentName("Leaders Lettings")).toBe("leaders");
  });
  it("normalises domains", () => {
    expect(normaliseDomain("https://www.Example.co.uk/path")).toBe("example.co.uk");
    expect(normaliseDomain("example.co.uk")).toBe("example.co.uk");
    expect(normaliseDomain("")).toBeNull();
  });
});

describe("matchAgent", () => {
  const targets = [
    { key: "branch", name: "Bernards Estate Agents", aliases: ["Bernards Southsea"], domain: "bernardsea.co.uk" },
    { key: "c1", name: "Fox & Sons", aliases: [], domain: "foxandsons.co.uk" },
  ];
  it("matches exact names and aliases with high confidence", () => {
    expect(matchAgent({ name: "Bernards" }, targets)).toMatchObject({ key: "branch", confidence: "high" });
    expect(matchAgent({ name: "Bernards Southsea" }, targets)).toMatchObject({ key: "branch", confidence: "high" });
  });
  it("matches by domain", () => {
    expect(matchAgent({ name: "Something", domain: "www.foxandsons.co.uk" }, targets)).toMatchObject({ key: "c1", confidence: "high" });
  });
  it("flags partial matches as low confidence", () => {
    expect(matchAgent({ name: "Bernards Drayton" }, targets)).toMatchObject({ key: "branch", confidence: "low" });
  });
  it("returns none for unknown agents", () => {
    expect(matchAgent({ name: "Chancellors" }, targets)).toMatchObject({ key: null, confidence: "none" });
  });
});
