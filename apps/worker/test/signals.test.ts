import { afterEach, describe, expect, it, vi } from "vitest";
import { crawlWebsite } from "../src/signals/crawl";
import { analyseJsonLd } from "../src/signals/jsonld";
import { classifyPage, isAreaPage, linkPriority } from "../src/signals/pages";
import { pickPlace, toSignal } from "../src/signals/places";
import { blockedAiBots, parseRobots } from "../src/signals/robots";

const BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot"];

describe("robots", () => {
  it("groups consecutive user-agents", () => {
    const g = parseRobots("User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: *\nDisallow: /admin");
    expect(g).toHaveLength(2);
    expect(g[0]!.agents).toEqual(["gptbot", "claudebot"]);
  });

  it("finds specific and wildcard blocks", () => {
    expect(blockedAiBots("User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow: /private", BOTS)).toEqual([
      { bot: "GPTBot", rule: "User-agent: GPTBot / Disallow: /" },
    ]);
    expect(blockedAiBots("User-agent: *\nDisallow: /", BOTS).map((b) => b.bot)).toEqual(BOTS);
  });

  it("a specific allow group overrides a wildcard block", () => {
    expect(blockedAiBots("User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nAllow: /", ["GPTBot"])).toEqual([]);
  });

  it("ignores partial disallows and comments", () => {
    expect(blockedAiBots("# Disallow: /\nUser-agent: GPTBot\nDisallow: /search", BOTS)).toEqual([]);
  });
});

describe("JSON-LD", () => {
  it("detects RealEstateAgent inside @graph with address", () => {
    const s = analyseJsonLd([
      JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite" }, { "@type": "RealEstateAgent", name: "B", address: { streetAddress: "1" }, aggregateRating: { ratingValue: 4.8 } }] }),
    ]);
    expect(s).toMatchObject({ hasRealEstateAgent: true, hasLocalBusiness: true, hasAddress: true, hasAggregateRating: true, valid: true });
    expect(s.types).toEqual(["WebSite", "RealEstateAgent"]);
  });

  it("flags invalid JSON and Organization-only markup", () => {
    const s = analyseJsonLd(["{not json", JSON.stringify({ "@type": "Organization", name: "B" })]);
    expect(s.valid).toBe(false);
    expect(s.hasLocalBusiness).toBe(false);
    expect(s.errors[0]).toMatch(/not valid JSON/);
  });

  it("requires a name on LocalBusiness", () => {
    expect(analyseJsonLd([JSON.stringify({ "@type": ["LocalBusiness"] })]).valid).toBe(false);
  });
});

describe("page detection", () => {
  it("classifies by url and headings", () => {
    expect(classifyPage("https://a.co.uk/faqs", "Help", [])).toEqual(["faq"]);
    expect(classifyPage("https://a.co.uk/x", "Book a valuation", [])).toEqual(["valuation"]);
    expect(classifyPage("https://a.co.uk/landlords/fees", "", [])).toEqual(["fees"]);
    expect(classifyPage("https://a.co.uk/meet-the-team", "", [])).toEqual(["team"]);
  });

  it("matches area pages by slug or heading, not substrings", () => {
    expect(isAreaPage("Southsea", "https://a.co.uk/areas/southsea", "", [])).toBe(true);
    expect(isAreaPage("North End", "https://a.co.uk/area-guides/north-end-guide", "", [])).toBe(true);
    expect(isAreaPage("Drayton", "https://a.co.uk/x", "Living in Drayton", [])).toBe(true);
    expect(isAreaPage("Drayton", "https://a.co.uk/draytonia", "", [])).toBe(false);
  });

  it("prioritises area and key pages", () => {
    expect(linkPriority("/areas/southsea", "Southsea", ["Southsea"])).toBeGreaterThan(linkPriority("/blog/news", "News", ["Southsea"]));
  });
});

describe("crawl (mocked fetch)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("produces a WebsiteCrawlSignal", async () => {
    const pages: Record<string, string> = {
      "https://agent.co.uk/": `<html><head><title>Estate agents in Portsmouth</title><meta name="description" content="Selling homes"></head><body>
        <a href="/areas/southsea">Southsea</a><a href="/faq">FAQ</a><a href="https://other.com/x">x</a><a href="mailto:a@b.c">m</a></body></html>`,
      "https://agent.co.uk/areas/southsea": `<html><head><title>Southsea guide</title></head><body><h1>Southsea</h1></body></html>`,
      "https://agent.co.uk/faq": `<html><head><title>FAQs</title><script type="application/ld+json">{"@type":"RealEstateAgent","name":"A","address":{}}</script></head></html>`,
      "https://agent.co.uk/robots.txt": "User-agent: GPTBot\nDisallow: /",
      "https://agent.co.uk/llms.txt": "<!doctype html><html>not found page</html>",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const body = pages[url];
        const res = new Response(body ?? "missing", { status: body ? 200 : 404 });
        Object.defineProperty(res, "url", { value: url });
        return res;
      }),
    );
    const s = await crawlWebsite({ website: "agent.co.uk", town: "Portsmouth", areas: ["Southsea", "Drayton"] });
    expect(s.ok).toBe(true);
    expect(s.fetchedPages).toBe(3);
    expect(s.pages.faqUrl).toBe("https://agent.co.uk/faq");
    expect(s.pages.areaPages).toEqual([
      { area: "Southsea", url: "https://agent.co.uk/areas/southsea" },
      { area: "Drayton", url: null },
    ]);
    expect(s.schema.hasRealEstateAgent).toBe(true);
    expect(s.robots.blockedBots.map((b) => b.bot)).toContain("GPTBot");
    expect(s.llmsTxt).toBe(false);
    expect(s.titleMentionsTown).toBe(true);
    expect(s.metaMentionsTown).toBe(false);
  });

  it("reports an unreachable homepage without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const s = await crawlWebsite({ website: "https://down.co.uk", town: "Portsmouth", areas: [] });
    expect(s.ok).toBe(false);
    expect(s.error).toMatch(/could not be fetched/);
  });
});

describe("places", () => {
  const places = [
    { id: "1", displayName: { text: "Bernards Estate Agents" }, websiteUri: "https://www.other.co.uk" },
    { id: "2", displayName: { text: "Bernards Southsea" }, websiteUri: "https://bernardsea.co.uk/southsea" },
  ];
  it("picks by domain first, then exact normalised name, else nothing", () => {
    expect(pickPlace(places, { name: "Bernards", domain: "bernardsea.co.uk" })?.id).toBe("2");
    expect(pickPlace(places, { name: "Bernards", domain: null })?.id).toBe("1");
    expect(pickPlace(places, { name: "Fox", domain: null })).toBeNull();
  });
  it("computes completeness and recent reviews", () => {
    const now = Date.parse("2026-10-01T00:00:00Z");
    const s = toSignal({ id: "x", rating: 4.7, userRatingCount: 120, types: ["real_estate_agency", "point_of_interest"], websiteUri: "https://a", reviews: [{ publishTime: "2026-09-20T00:00:00Z" }, { publishTime: "2025-01-01T00:00:00Z" }] }, now);
    expect(s).toMatchObject({ found: true, reviewCount: 120, recentReviews90d: 1, categories: ["real_estate_agency"], completeness: 40 });
    expect(s.missingFields).toEqual(["phone number", "opening hours", "address"]);
    expect(toSignal(null).found).toBe(false);
  });
});
