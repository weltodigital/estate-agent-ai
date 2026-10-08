// Rule-based recommendation engine (v1).
//
// Each rule: a condition on the branch's signals and/or the gap to the
// competitors AI recommends -> zero or more fix items, each carrying the
// evidence behind it. A rule that lacks the data to decide stays silent: no
// generic advice without numbers behind it.
//
// Rules are versioned and identified by id so that, later, rule_weights can
// be fitted from the cross-agent dataset (fix completed -> visibility change).

import {
  buildLlmsTxt,
  buildRealEstateAgentJsonLd,
  buildReviewTemplates,
  buildRobotsFix,
  CITATION_SOURCE_GUIDES,
  DRAFT_NOTE,
} from "./assets";
import type { RecommendationDraft, Rule, RuleContext } from "./types";

export type * from "./types";
export { DRAFT_NOTE } from "./assets";

const round1 = (n: number) => Math.round(n * 10) / 10;

function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

/** Prompts where the branch is named in under a third of responses. */
function losingPrompts(ctx: RuleContext) {
  return ctx.prompts.filter((p) => p.responses > 0 && (p.visibility ?? 0) < 33);
}

const reviewGap: Rule = {
  id: "review_gap",
  version: 1,
  description: "Recommended competitors have far more Google reviews than the branch.",
  evaluate(ctx) {
    const own = ctx.gbp?.reviewCount;
    if (!ctx.gbp?.found || own === null || own === undefined) return [];
    const comps = ctx.topCompetitors.filter((c) => c.gbp?.found && c.gbp.reviewCount !== null);
    const compAvg = avg(comps.map((c) => c.gbp!.reviewCount!));
    if (compAvg === null || comps.length < 2) return [];
    // "Far more": at least 50% more and at least 30 reviews more.
    if (!(compAvg >= own * 1.5 && compAvg - own >= 30)) return [];
    const gap = Math.round(compAvg - own);
    return [
      {
        ruleId: this.id,
        ruleVersion: this.version,
        fingerprint: this.id,
        title: `Close the Google review gap (${own} vs an average of ${Math.round(compAvg)})`,
        why: `The ${comps.length} agents AI recommends most in ${ctx.branch.town} average ${Math.round(compAvg)} Google reviews; you have ${own}. AI answers about "highest rated" and "best reviewed" agents lean on review volume and rating. A steady flow of new reviews closes a gap of ${gap}.`,
        priority: gap > 100 ? 1 : 2,
        effort: "M",
        evidence: {
          branch: { reviewCount: own, rating: ctx.gbp.rating, recentReviews90d: ctx.gbp.recentReviews90d },
          competitors: comps.map((c) => ({
            name: c.name,
            reviewCount: c.gbp!.reviewCount,
            rating: c.gbp!.rating,
            visibility: c.visibility,
          })),
          competitorAverage: round1(compAvg),
        },
        asset: { kind: "review-templates", text: buildReviewTemplates(ctx.branch) },
      },
    ];
  },
};

const missingSchema: Rule = {
  id: "missing_schema",
  version: 1,
  description: "No valid RealEstateAgent / LocalBusiness structured data on the site.",
  evaluate(ctx) {
    const c = ctx.crawl;
    if (!c?.ok) return [];
    const hasAgentSchema = (c.schema.hasRealEstateAgent || c.schema.hasLocalBusiness) && c.schema.valid;
    if (hasAgentSchema && c.schema.hasAddress) return [];
    const compsWith = ctx.topCompetitors
      .filter((x) => x.crawl?.ok && (x.crawl.schema.hasRealEstateAgent || x.crawl.schema.hasLocalBusiness))
      .map((x) => x.name);
    const problem = !hasAgentSchema
      ? c.schema.types.length
        ? `Your site has structured data (${c.schema.types.join(", ")}) but no valid RealEstateAgent or LocalBusiness block.`
        : "We found no structured data on your homepage."
      : "Your RealEstateAgent structured data has no address.";
    return [
      {
        ruleId: this.id,
        ruleVersion: this.version,
        fingerprint: this.id,
        title: "Add RealEstateAgent structured data",
        why: `${problem} Structured data tells AI assistants, in a form they can read reliably, who you are, where you are and which areas you cover.${compsWith.length ? ` ${compsWith.join(", ")} already have it.` : ""}`,
        priority: 2,
        effort: "S",
        evidence: {
          homepage: c.homepageUrl,
          schemaTypesFound: c.schema.types,
          errors: c.schema.errors,
          competitorsWithSchema: compsWith,
        },
        asset: { kind: "json-ld", text: buildRealEstateAgentJsonLd(ctx.branch, ctx.gbp) },
      },
    ];
  },
};

const citationGap: Rule = {
  id: "citation_gap",
  version: 1,
  description: "AI cites a domain for competitors where the branch is absent.",
  evaluate(ctx) {
    const own = ctx.branch.domain;
    const gaps = ctx.citations
      .filter(
        (c) =>
          !c.citesBranch &&
          c.competitorsCited.length > 0 &&
          c.responses >= 2 &&
          c.domain !== own &&
          // Competitors' own websites aren't somewhere you can "get listed".
          !ctx.topCompetitors.some((tc) => tc.domain && c.domain.endsWith(tc.domain)),
      )
      .sort((a, b) => b.responses - a.responses)
      .slice(0, 5);
    return gaps.map((g, i): RecommendationDraft => {
      const guide = CITATION_SOURCE_GUIDES[g.domain.replace(/^www\./, "")];
      const label = guide?.label ?? g.domain;
      const steps = guide?.steps ?? [
        `Visit ${g.domain} and search for agents in ${ctx.branch.town}.`,
        "If there's a listing or directory, add or claim your branch with consistent name, address and phone.",
        "If it's editorial (a news site or guide), it's worth a pitch: local market commentary is often quoted.",
      ];
      return {
        ruleId: citationGap.id,
        ruleVersion: citationGap.version,
        fingerprint: `${citationGap.id}:${g.domain}`,
        title: `Get listed on ${label}`,
        why: `AI cited ${g.domain} in ${g.responses} answers about agents in ${ctx.branch.town}, alongside ${g.competitorsCited.slice(0, 3).join(", ")}${g.competitorsCited.length > 3 ? " and others" : ""}. None of those citations included you.`,
        priority: i === 0 ? 2 : 3,
        effort: "S",
        evidence: { domain: g.domain, responses: g.responses, competitorsCited: g.competitorsCited },
        asset: { kind: "steps", text: steps.map((s, n) => `${n + 1}. ${s}`).join("\n") },
      };
    });
  },
};

const missingAreaPages: Rule = {
  id: "missing_area_pages",
  version: 1,
  description: "No page for neighbourhoods named in tracked prompts.",
  evaluate(ctx) {
    const c = ctx.crawl;
    if (!c?.ok) return [];
    const promptAreas = new Set(ctx.prompts.map((p) => p.area).filter((a): a is string => !!a));
    const missing = c.pages.areaPages.filter((p) => !p.url && promptAreas.has(p.area));
    return missing.slice(0, 5).map((m): RecommendationDraft => {
      const areaPrompts = ctx.prompts.filter((p) => p.area === m.area);
      const namedInstead = [...new Set(areaPrompts.flatMap((p) => p.namedInstead))].slice(0, 5);
      const vis = avg(areaPrompts.map((p) => p.visibility).filter((v): v is number => v !== null));
      return {
        ruleId: missingAreaPages.id,
        ruleVersion: missingAreaPages.version,
        fingerprint: `${missingAreaPages.id}:${m.area.toLowerCase()}`,
        title: `Create a ${m.area} area page`,
        why: `You track ${areaPrompts.length} question${areaPrompts.length === 1 ? "" : "s"} about ${m.area}${vis !== null ? ` and AI names you in ${Math.round(vis)}% of those answers` : ""}, but we couldn't find a page about ${m.area} on your site.${namedInstead.length ? ` AI names ${namedInstead.join(", ")} instead.` : ""}`,
        priority: vis !== null && vis < 20 ? 2 : 3,
        effort: "M",
        evidence: { area: m.area, prompts: areaPrompts.map((p) => ({ text: p.text, visibility: p.visibility })), namedInstead },
        asset: {
          kind: "area-page",
          generate: {
            instructions:
              "Write a draft area page (600-800 words, UK English) for an estate and letting agent's website about the named neighbourhood. Cover: what the area is like to live in, typical property types, who buys and rents there, and how the agency helps sellers and landlords there. Use only facts that are widely known about the area; where a specific fact (prices, schools, transport times) would help, insert a [CHECK: ...] placeholder instead of inventing it. No clichés (stunning, nestled, boasting, sought-after). No promises about rankings. Markdown, with an H1 and H2 subheadings, ending with a short FAQ of 3 questions.",
            input: { agency: ctx.branch.name, area: m.area, town: ctx.branch.town },
          },
        },
      };
    });
  },
};

const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended"];

const robotsBlocksAi: Rule = {
  id: "robots_blocks_ai",
  version: 1,
  description: "robots.txt blocks AI crawlers.",
  evaluate(ctx) {
    const r = ctx.crawl?.robots;
    if (!r?.fetched || !r.blockedBots.length) return [];
    return [
      {
        ruleId: this.id,
        ruleVersion: this.version,
        fingerprint: this.id,
        title: "Stop blocking AI crawlers in robots.txt",
        why: `Your robots.txt blocks ${r.blockedBots.map((b) => b.bot).join(", ")}. Assistants that respect it can't read your site, so they rely on what other sites say about you.`,
        priority: 1,
        effort: "S",
        evidence: { blocked: r.blockedBots, robotsUrl: ctx.crawl?.homepageUrl ? new URL("/robots.txt", ctx.crawl.homepageUrl).toString() : null },
        asset: { kind: "robots", text: buildRobotsFix(r.raw, r.blockedBots) },
      },
    ];
  },
};

const missingFaq: Rule = {
  id: "missing_faq",
  version: 1,
  description: "No FAQ answering seller/landlord questions; built from the prompts they're losing.",
  evaluate(ctx) {
    const c = ctx.crawl;
    if (!c?.ok || c.pages.faqUrl) return [];
    const losing = losingPrompts(ctx);
    if (!losing.length) return [];
    return [
      {
        ruleId: this.id,
        ruleVersion: this.version,
        fingerprint: this.id,
        title: "Add an FAQ that answers the questions you're losing",
        why: `We couldn't find an FAQ page on your site. AI names you in under a third of answers to ${losing.length} of your ${ctx.prompts.length} tracked questions. A page that answers those questions directly, in your words, gives assistants something specific to cite.`,
        priority: 2,
        effort: "M",
        evidence: {
          losingPrompts: losing.map((p) => ({ text: p.text, visibility: p.visibility, namedInstead: p.namedInstead.slice(0, 3) })),
        },
        asset: {
          kind: "faq",
          generate: {
            instructions:
              "Write a draft FAQ for an estate and letting agent's website (UK English). Turn each question people ask AI into a natural FAQ question a seller or landlord would ask the agency, and write a 60-120 word answer in the agency's voice. Be specific to the town. Where a fact is needed that you don't know (fees, years trading, review counts, awards), use a [CHECK: ...] placeholder; never invent figures. No clichés (stunning, nestled, boasting). No promises about rankings or guaranteed results. Output Markdown, then a FAQPage JSON-LD block in a fenced code block matching the same questions.",
            input: { agency: ctx.branch.name, town: ctx.branch.town, areas: ctx.branch.areas, questions: losing.map((p) => p.text) },
          },
        },
      },
    ];
  },
};

const missingLlmsTxt: Rule = {
  id: "missing_llms_txt",
  version: 1,
  description: "No llms.txt.",
  evaluate(ctx) {
    const c = ctx.crawl;
    if (!c?.ok || c.llmsTxt) return [];
    return [
      {
        ruleId: this.id,
        ruleVersion: this.version,
        fingerprint: this.id,
        title: "Publish an llms.txt file",
        why: `There's no /llms.txt on ${ctx.branch.domain ?? "your site"}. It's a small, emerging convention: a plain summary of who you are and links to your key pages, for AI tools to read. Low effort. Its effect is not yet proven, so treat it as housekeeping.`,
        priority: 4,
        effort: "S",
        evidence: { checkedUrl: new URL("/llms.txt", c.homepageUrl).toString() },
        asset: {
          kind: "llms-txt",
          text: buildLlmsTxt(ctx.branch, {
            Valuations: c.pages.valuationUrl,
            Fees: c.pages.feesUrl,
            "Meet the team": c.pages.teamUrl,
            FAQ: c.pages.faqUrl,
            ...Object.fromEntries(c.pages.areaPages.filter((a) => a.url).map((a) => [`${a.area} area guide`, a.url])),
          }),
        },
      },
    ];
  },
};

const missingValuationPage: Rule = {
  id: "missing_valuation_page",
  version: 1,
  description: "No valuation page while valuation prompts are being lost.",
  evaluate(ctx) {
    const c = ctx.crawl;
    if (!c?.ok || c.pages.valuationUrl) return [];
    const val = ctx.prompts.filter((p) => p.intentGroup === "valuation" && p.responses > 0);
    const vis = avg(val.map((p) => p.visibility).filter((v): v is number => v !== null));
    if (!val.length || vis === null || vis >= 50) return [];
    return [
      {
        ruleId: this.id,
        ruleVersion: this.version,
        fingerprint: this.id,
        title: "Add a dedicated valuation page",
        why: `AI names you in ${Math.round(vis)}% of answers to valuation questions like "${val[0]!.text}", and we couldn't find a valuation page on your site. A page explaining how you value homes in ${ctx.branch.town} gives assistants something to point to.`,
        priority: 3,
        effort: "M",
        evidence: { prompts: val.map((p) => ({ text: p.text, visibility: p.visibility, namedInstead: p.namedInstead.slice(0, 3) })) },
        asset: {
          kind: "valuation-page",
          text: [
            DRAFT_NOTE,
            "",
            `# Free house valuations in ${ctx.branch.town}`,
            "",
            `Suggested outline for ${ctx.branch.name}:`,
            "1. How you value: the local sales evidence you use and who visits.",
            `2. The areas you cover: ${[ctx.branch.town, ...ctx.branch.areas].join(", ")}.`,
            "3. What happens after the valuation, with no obligation.",
            "4. Recent results: [CHECK: add real figures you can stand behind].",
            "5. A short booking form, with your phone number in plain text.",
          ].join("\n"),
        },
      },
    ];
  },
};

export const RULES: Rule[] = [
  robotsBlocksAi,
  reviewGap,
  missingSchema,
  citationGap,
  missingAreaPages,
  missingFaq,
  missingValuationPage,
  missingLlmsTxt,
];

export function evaluateRules(ctx: RuleContext, weights: Record<string, number> = {}): RecommendationDraft[] {
  const drafts = RULES.flatMap((r) => {
    try {
      return r.evaluate(ctx);
    } catch (err) {
      console.error(`rule ${r.id} failed`, err);
      return [];
    }
  });
  // Weight hook for later: a higher weight nudges priority up one notch.
  return drafts
    .map((d) => ((weights[d.ruleId] ?? 1) > 1.5 && d.priority > 1 ? { ...d, priority: (d.priority - 1) as RecommendationDraft["priority"] } : d))
    .sort((a, b) => a.priority - b.priority);
}

export { AI_BOTS };
