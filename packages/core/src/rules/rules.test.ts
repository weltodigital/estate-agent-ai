import { describe, expect, it } from "vitest";
import type { WebsiteCrawlSignal } from "../domain";
import { evaluateRules, RULES } from "./index";
import type { RuleContext } from "./types";

const crawl: WebsiteCrawlSignal = {
  ok: true,
  homepageUrl: "https://agent.co.uk/",
  fetchedPages: 5,
  schema: { types: [], hasRealEstateAgent: false, hasLocalBusiness: false, hasAddress: false, hasAggregateRating: false, valid: false, errors: [] },
  pages: { areaPages: [{ area: "Southsea", url: null }], faqUrl: null, teamUrl: null, feesUrl: null, valuationUrl: null },
  robots: { fetched: true, blockedBots: [{ bot: "GPTBot", rule: "User-agent: GPTBot / Disallow: /" }], raw: "User-agent: GPTBot\nDisallow: /" },
  llmsTxt: false,
  titleMentionsTown: true,
  metaMentionsTown: false,
  speed: { ttfbMs: 300, htmlKb: 80 },
};

const gbp = (reviewCount: number) => ({
  found: true, placeId: "x", name: "x", rating: 4.6, reviewCount, recentReviews90d: null, categories: [], completeness: 80, missingFields: [],
});

const ctx: RuleContext = {
  branch: { id: "b", name: "Agent", domain: "agent.co.uk", website: "https://agent.co.uk", town: "Portsmouth", areas: ["Southsea"], postcode: "PO5 1AA" },
  crawl,
  gbp: gbp(40),
  topCompetitors: [
    { id: "c1", name: "Fox", domain: "fox.co.uk", visibility: 80, gbp: gbp(300), crawl: null },
    { id: "c2", name: "Bear", domain: "bear.co.uk", visibility: 60, gbp: gbp(200), crawl: null },
  ],
  prompts: [
    { text: "best estate agent in Southsea", intentGroup: "selling", area: "Southsea", responses: 12, visibility: 8, namedInstead: ["Fox"] },
    { text: "who gives accurate house valuations in Portsmouth", intentGroup: "valuation", area: null, responses: 12, visibility: 10, namedInstead: ["Bear"] },
  ],
  citations: [{ domain: "allagents.co.uk", responses: 6, citesBranch: false, competitorsCited: ["Fox", "Bear"] }],
  branchVisibility: 9,
  totalResponses: 24,
};

describe("rules", () => {
  it("has at least 6 rules", () => expect(RULES.length).toBeGreaterThanOrEqual(6));

  it("fires every rule on a weak site, each with evidence", () => {
    const drafts = evaluateRules(ctx);
    const ids = new Set(drafts.map((d) => d.ruleId));
    for (const id of ["robots_blocks_ai", "review_gap", "missing_schema", "citation_gap", "missing_area_pages", "missing_faq", "missing_valuation_page", "missing_llms_txt"]) {
      expect(ids.has(id), id).toBe(true);
    }
    for (const d of drafts) {
      expect(Object.keys(d.evidence).length).toBeGreaterThan(0);
      expect(d.why).not.toMatch(/guarantee|rank #?1/i);
    }
    expect(drafts[0]!.ruleId).toBe("robots_blocks_ai");
  });

  it("stays silent without data", () => {
    const drafts = evaluateRules({ ...ctx, crawl: null, gbp: null, citations: [], prompts: [], topCompetitors: [] });
    expect(drafts).toEqual([]);
  });
});
