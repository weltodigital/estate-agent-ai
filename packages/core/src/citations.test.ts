import { describe, expect, it } from "vitest";
import { agencyDomainFor, attributeCitations, isCitationGap, isNonAgentDomain } from "./citations";

describe("agency domains (from the first live paid scan)", () => {
  it("rejects portals, directories and councils as an agency's website", () => {
    expect(agencyDomainFor("andrew lodge", "rightmove.co.uk")).toBeNull();
    expect(agencyDomainFor("trueman grundy", "farnham.gov.uk")).toBeNull();
    expect(agencyDomainFor("greenwood", "www.getagent.co.uk")).toBeNull();
    expect(isNonAgentDomain("uk.trustpilot.com")).toBe(true);
  });
  it("accepts a site that looks like the agency's own", () => {
    expect(agencyDomainFor("bourne", "bourneestateagents.com")).toBe("bourneestateagents.com");
    expect(agencyDomainFor("andrew lodge", "www.andrewlodge.net")).toBe("andrewlodge.net");
    expect(agencyDomainFor("bourne", "unrelated.co.uk")).toBeNull();
    expect(agencyDomainFor("trueman company tlc", "tlc-farnham.co.uk")).toBe("tlc-farnham.co.uk");
  });
});

describe("attributeCitations", () => {
  const cite = (resultId: string, url: string, isOwnDomain = false) => ({
    resultId,
    url,
    domain: new URL(url).hostname,
    isOwnDomain,
  });
  const names = new Map([
    ["r1", { branch: true, competitorIds: ["w"] }],
    ["r2", { branch: false, competitorIds: ["w"] }],
  ]);
  const branch = { normalisedNames: ["keats fearn"], domain: "keatsfearn.co.uk" };
  const comps = [
    { id: "w", normalisedName: "winkworth", domain: null },
    { id: "b", normalisedName: "bourne", domain: null },
  ];

  it("credits the branch for its own profile page on a portal", () => {
    const [a] = attributeCitations([cite("r1", "https://www.rightmove.co.uk/estate-agents/agent/Keats-Fearn/Farnham-1234.html")], names, branch, comps);
    expect(a).toMatchObject({ domain: "rightmove.co.uk", citesBranch: true });
    expect(isCitationGap(a!)).toBe(false);
  });

  it("reports a third-party gap but never a competitor's own website", () => {
    const stats = attributeCitations(
      [
        cite("r2", "https://www.getagent.co.uk/estate-agents/farnham"),
        cite("r2", "https://www.winkworth.co.uk/farnham"),
        cite("r1", "https://www.bourneestateagents.com/"),
      ],
      names,
      branch,
      comps,
    );
    const by = Object.fromEntries(stats.map((s) => [s.domain, s]));
    expect(isCitationGap(by["getagent.co.uk"]!)).toBe(true);
    expect(by["winkworth.co.uk"]).toMatchObject({ isAgentSite: true });
    expect(isCitationGap(by["winkworth.co.uk"]!)).toBe(false);
    expect(by["bourneestateagents.com"]).toMatchObject({ isAgentSite: true, aboutIds: ["b"] });
    // A town listing page is about nobody, even though competitors are named alongside.
    expect(by["getagent.co.uk"]).toMatchObject({ aboutIds: [], competitorIds: ["w"] });
  });

  it("merges country subdomains into one site", () => {
    const stats = attributeCitations(
      [cite("r2", "https://uk.trustpilot.com/review/x"), cite("r2", "https://www.trustpilot.com/review/y")],
      names,
      branch,
      comps,
    );
    expect(stats.map((s) => s.domain)).toEqual(["trustpilot.com"]);
  });
});
