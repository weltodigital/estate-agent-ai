// Seeds the public demo agency shown at /sample-report: an invented agency,
// "Harbour & Hale" in Southsea, with invented competitors and synthetic,
// clearly-labelled example data. Idempotent: wipes and recreates the demo
// organisation's data each run.
//
// Every agency name here is invented and was checked against real domains;
// agency websites use the reserved .example TLD so they can never resolve.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/seed-demo.ts

import {
  normaliseAgentName,
  normaliseDomain,
  renderPromptsForBranch,
  type IntentGroup,
  type PromptTemplate,
  type WebsiteCrawlSignal,
  type GoogleBusinessSignal,
} from "@privett/core";
import { RunBudget } from "../src/cost";
import { db, insertChunked, must } from "../src/db";
import { generateRecommendations } from "../src/recommendations";
import { updateRollups } from "../src/rollups";

const DEMO_ORG_NAME = "Example Agency (demo)";
// Fixed so the public /sample-report URL never changes between seeds.
// Keep in sync with DEMO_BRANCH_ID in apps/web/lib/demo.ts.
export const DEMO_BRANCH_ID = "311b454f-066d-4307-81a5-3d30b659aee7";
const TOWN = "Southsea";
const AREAS = ["Albert Road", "Eastney", "Milton"];
const PLACES = [TOWN, ...AREAS];
const DAY = 86_400_000;

// Deterministic pseudo-randomness so the demo looks the same every seed.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261011);
const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)]!;
const between = (a: number, b: number) => Math.round(a + rand() * (b - a));

interface Agency {
  name: string;
  slug: string;
  weight: number; // base chance of being named
  letting: number; // extra weight on letting/landlord questions
  descriptors: string[];
  /** Whole phrases an assistant might use about the agency. */
  lines: string[];
  firstScan?: number; // only appears from this scan index on
}

const YOU: Agency = {
  name: "Harbour & Hale",
  slug: "harbourandhale",
  weight: 0,
  letting: 0,
  descriptors: ["independent", "strong local knowledge", "responsive", "well reviewed", "family-run"],
  lines: [
    "an independent, family-run agent with strong local knowledge",
    "well reviewed for keeping sellers updated",
    "known for realistic valuations and a responsive team",
    "a local agent that sells and lets across Southsea, Eastney and Milton",
  ],
};
const COMPETITORS: Agency[] = [
  { name: "Marsh Lettings", slug: "marshlettings", weight: 0.45, letting: 0.35, descriptors: ["lettings specialist", "large rental portfolio", "landlord-focused"], lines: ["a lettings specialist with a large rental portfolio", "popular with landlords for full management", "focused on lettings and property management"] },
  { name: "Fenwick Ashby", slug: "fenwickashby", weight: 0.55, letting: 0, descriptors: ["long-established", "high street presence", "strong sales record"], lines: ["long-established, with a busy high street office", "a strong sales record across Southsea", "one of the better-known names locally"] },
  { name: "Linden & Rowe", slug: "lindenandrowe", weight: 0.5, letting: 0.05, descriptors: ["premium homes", "good marketing", "well reviewed"], lines: ["good for higher-value homes, with strong marketing", "well reviewed for presentation and photography", "often mentioned for period and premium properties"] },
  { name: "Calder Moore", slug: "caldermoore", weight: 0.4, letting: 0.1, descriptors: ["accurate valuations", "friendly team", "competitive fees"], lines: ["known for accurate valuations", "a friendly team with competitive fees", "good feedback on communication"] },
  { name: "Sallow & Finch", slug: "sallowandfinch", weight: 0.32, letting: 0.15, descriptors: ["independent", "local experts", "responsive"], lines: ["a smaller independent with local experts", "responsive and personal service", "worth a look for flats near the seafront"] },
  { name: "Corrin Mead", slug: "corrinmead", weight: 0.28, letting: 0, descriptors: ["period properties", "personal service"], lines: ["experienced with period properties", "a personal, smaller-office service"] },
  { name: "Hollis Brayne", slug: "hollisbrayne", weight: 0.22, letting: 0.1, descriptors: ["national network", "online valuations"], lines: ["part of a national network, with online valuations", "a large reach for advertising"] },
  { name: "Wrenfield Homes", slug: "wrenfieldhomes", weight: 0.18, letting: 0.05, descriptors: ["new homes", "first-time buyers"], lines: ["helpful for first-time buyers", "active with new-build homes"] },
  { name: "Merrowgate Property", slug: "merrowgate", weight: 0.3, letting: 0.1, descriptors: ["new to the area", "modern marketing"], lines: ["newer to the area, with modern marketing", "a growing presence in Southsea"], firstScan: 3 },
];

// Your chance of being named, by engine, rising scan by scan.
const YOU_BY_ENGINE: Record<string, number> = { openai: 0.58, anthropic: 0.64, gemini: 0.54, perplexity: 0.32 };
const SCAN_FACTOR = [0.78, 0.82, 0.9, 1];
const SCAN_DAYS_AGO = [50, 40, 9, 2];
const ENGINES = [
  { id: "openai", model: "gpt-5-mini" },
  { id: "perplexity", model: "perplexity/sonar" },
  { id: "gemini", model: "gemini-2.5-flash" },
  { id: "anthropic", model: "claude-sonnet-5-5" },
];

const INTROS: Record<IntentGroup, string[]> = {
  selling: [
    "Here are some well-regarded estate agents in {place} to consider when selling:",
    "Agents in {place} that consistently come up for sales include:",
    "If you're selling in {place}, these agents are worth speaking to:",
  ],
  valuation: [
    "For an accurate valuation in {place}, it's worth inviting two or three of these agents:",
    "Agents in {place} known for realistic valuations include:",
  ],
  letting: [
    "Letting agents in {place} with a good reputation include:",
    "For letting in {place}, these agents are often recommended:",
  ],
  landlord: [
    "For landlords in {place}, these letting agents are worth considering:",
    "Agents in {place} that landlords tend to rate for management include:",
  ],
  comparison: [
    "Based on recent reviews and listings, highly rated agents in {place} include:",
    "Agents in {place} with strong reviews include:",
  ],
};
const OUTROS = [
  "Ask each for recent sales nearby and their fees before you decide.",
  "It's worth comparing fees, contract length and recent results in your street.",
  "Check recent reviews and ask how they would market your property.",
  "Results vary by street and property type, so speak to more than one agent.",
];

function phrase(a: Agency): string {
  return pick(a.lines);
}

async function main() {
  const now = Date.now();

  // --- Reset the demo organisation -----------------------------------------
  const { data: old } = await db().from("organisations").select("id").eq("is_demo", true);
  for (const o of old ?? []) await db().from("organisations").delete().eq("id", o.id);
  const org = must(
    await db().from("organisations").insert({ name: DEMO_ORG_NAME, is_demo: true, claimed: true }).select("id").single(),
    "insert org",
  ) as { id: string };

  const branch = must(
    await db()
      .from("branches")
      .insert({
        id: DEMO_BRANCH_ID,
        org_id: org.id,
        name: YOU.name,
        aliases: ["Harbour and Hale"],
        website: "https://harbourandhale.example",
        domain: "harbourandhale.example",
        town: TOWN,
        areas: AREAS,
        postcode: "PO5 2AA",
      })
      .select("*")
      .single(),
    "insert branch",
  ) as { id: string; org_id: string; name: string; aliases: string[]; website: string; domain: string; town: string; areas: string[]; postcode: string; place_id: string | null };

  const library = must(await db().from("prompts").select("id, template, intent_group, uses_area, sort_order").is("org_id", null).eq("active", true), "prompts") as PromptTemplate[];
  const rendered = renderPromptsForBranch(library, { town: TOWN, areas: AREAS }, 18);
  const prompts = must(
    await db()
      .from("branch_prompts")
      .insert(rendered.map((p) => ({ org_id: org.id, branch_id: branch.id, prompt_id: p.prompt_id, text: p.text, intent_group: p.intent_group, area: p.area })))
      .select("id, text, intent_group, area"),
    "insert prompts",
  ) as { id: string; text: string; intent_group: IntentGroup; area: string | null }[];

  const compRows = must(
    await db()
      .from("competitors")
      .insert(
        COMPETITORS.map((c) => ({
          org_id: org.id,
          branch_id: branch.id,
          name: c.name,
          normalised_name: normaliseAgentName(c.name, PLACES),
          domain: `${c.slug}.example`,
          status: c.name === "Fenwick Ashby" ? "pinned" : "discovered",
          first_seen_at: new Date(now - SCAN_DAYS_AGO[c.firstScan ?? 0]! * DAY).toISOString(),
        })),
      )
      .select("id, name"),
    "insert competitors",
  ) as { id: string; name: string }[];
  const compId = new Map(compRows.map((c) => [c.name, c.id]));

  // --- Scans ----------------------------------------------------------------
  let lastRunId = "";
  for (let s = 0; s < SCAN_DAYS_AGO.length; s++) {
    const started = now - SCAN_DAYS_AGO[s]! * DAY;
    const run = must(
      await db()
        .from("scan_runs")
        .insert({
          org_id: org.id,
          branch_id: branch.id,
          kind: "scheduled",
          status: "completed",
          engines: ENGINES.map((e) => e.id),
          runs_per_prompt: 3,
          budget_usd: 12,
          cost_usd: 7.4,
          scheduled_for: new Date(started).toISOString(),
          started_at: new Date(started).toISOString(),
          finished_at: new Date(started + 6 * 60_000).toISOString(),
          progress: { done: prompts.length * ENGINES.length * 3, total: prompts.length * ENGINES.length * 3 },
          attempts: 1,
          created_at: new Date(started).toISOString(),
        })
        .select("id")
        .single(),
      "insert run",
    ) as { id: string };
    lastRunId = run.id;

    const results: Record<string, unknown>[] = [];
    const pending: { mentions: Record<string, unknown>[]; citations: Record<string, unknown>[] }[] = [];
    let k = 0;
    for (const p of prompts) {
      for (const e of ENGINES) {
        for (let r = 0; r < 3; r++) {
          const lettingQ = p.intent_group === "letting" || p.intent_group === "landlord";
          const pool = COMPETITORS.filter((c) => (c.firstScan ?? 0) <= s);
          const named: Agency[] = pool.filter((c) => rand() < Math.min(0.9, c.weight + (lettingQ ? c.letting : 0)));
          while (named.length < 3) {
            const extra = pick(pool);
            if (!named.includes(extra)) named.push(extra);
          }
          named.sort(() => rand() - 0.5);
          const list = named.slice(0, between(3, 5));
          const youNamed = rand() < (YOU_BY_ENGINE[e.id] ?? 0.4) * SCAN_FACTOR[s]! * (p.area === "Eastney" ? 0.4 : 1);
          if (youNamed) list.splice(Math.min(list.length, between(0, 3)), 0, YOU);

          // Citations: your Rightmove page sometimes; competitors' Zoopla and
          // Trustpilot pages (you have none there, hence the gaps); a town
          // page on GetAgent; agencies' own .example sites.
          const cites: { url: string; for?: Agency }[] = [{ url: `https://www.getagent.co.uk/estate-agents/${TOWN.toLowerCase()}` }];
          for (const a of list) {
            const roll = rand();
            if (a === YOU) {
              if (roll < 0.6) cites.push({ url: `https://www.rightmove.co.uk/estate-agents/agent/Harbour-and-Hale/Southsea-${100000 + k}.html`, for: a });
              else cites.push({ url: "https://harbourandhale.example/", for: a });
            } else if (roll < 0.35) cites.push({ url: `https://uk.trustpilot.com/review/${a.slug}.example`, for: a });
            else if (roll < 0.65) cites.push({ url: `https://www.zoopla.co.uk/find-agents/branch/${a.slug}-${TOWN.toLowerCase()}-${2000 + k}/`, for: a });
            else cites.push({ url: `https://${a.slug}.example/`, for: a });
          }
          const place = p.area ? `${p.area}, ${TOWN}` : TOWN;
          const lines = list.map((a, i) => {
            const n = cites.findIndex((c) => c.for === a) + 1;
            return `- **${a.name}**: ${phrase(a)}.${n > 0 ? `[${n}]` : ""}${i === 0 ? "[1]" : ""}`;
          });
          const answer = [pick(INTROS[p.intent_group]).replace("{place}", place), "", ...lines, "", pick(OUTROS)].join("\n");

          const youPos = list.indexOf(YOU) + 1;
          const youScore = between(62, 84);
          const createdAt = new Date(started + (k % 400) * 900).toISOString();
          const id = crypto.randomUUID();
          results.push({
            id,
            scan_run_id: run.id,
            org_id: org.id,
            branch_id: branch.id,
            branch_prompt_id: p.id,
            engine: e.id,
            model: e.model,
            prompt_text: p.text,
            intent_group: p.intent_group,
            run_index: r,
            answer_text: answer,
            raw_json: { example: true, note: "Synthetic demo data" },
            parse_status: "ok",
            mentioned: youNamed,
            position: youNamed ? youPos : null,
            sentiment_label: youNamed ? "positive" : null,
            sentiment_score: youNamed ? youScore : null,
            descriptors: youNamed ? [...YOU.descriptors].sort(() => rand() - 0.5).slice(0, 3) : [],
            match_confidence: youNamed ? "high" : "none",
            cost_usd: 0.03,
            created_at: createdAt,
          });
          pending.push({
            mentions: list.map((a, i) => ({
              scan_result_id: id,
              org_id: org.id,
              branch_id: branch.id,
              agent_name: a.name,
              normalised_name: normaliseAgentName(a.name, PLACES),
              position: i + 1,
              is_branch: a === YOU,
              matched_competitor_id: a === YOU ? null : (compId.get(a.name) ?? null),
              match_confidence: "high",
              sentiment_score: a === YOU ? youScore : between(55, 80),
              descriptors: [...a.descriptors].sort(() => rand() - 0.5).slice(0, 3),
            })),
            citations: cites.map((c) => {
              const domain = normaliseDomain(c.url)!;
              return {
                scan_result_id: id,
                org_id: org.id,
                branch_id: branch.id,
                url: c.url,
                domain,
                is_own_domain: domain === branch.domain,
                competitor_id: COMPETITORS.find((a) => `${a.slug}.example` === domain) ? compId.get(COMPETITORS.find((a) => `${a.slug}.example` === domain)!.name) : null,
              };
            }),
          });
          k++;
        }
      }
    }
    await insertChunked("scan_results", results);
    await insertChunked("agent_mentions", pending.flatMap((x) => x.mentions));
    await insertChunked("citations", pending.flatMap((x) => x.citations));
    console.log(`scan ${s + 1}: ${results.length} answers, named in ${results.filter((r) => r.mentioned).length}`);
  }

  // --- Signals ---------------------------------------------------------------
  const crawl: WebsiteCrawlSignal = {
    ok: true,
    homepageUrl: "https://harbourandhale.example/",
    fetchedPages: 12,
    schema: { types: ["WebSite"], hasRealEstateAgent: false, hasLocalBusiness: false, hasAddress: false, hasAggregateRating: false, valid: true, errors: [] },
    pages: {
      areaPages: [
        { area: "Albert Road", url: "https://harbourandhale.example/areas/albert-road" },
        { area: "Eastney", url: null },
        { area: "Milton", url: "https://harbourandhale.example/areas/milton" },
      ],
      faqUrl: null,
      teamUrl: "https://harbourandhale.example/team",
      feesUrl: "https://harbourandhale.example/fees",
      valuationUrl: null,
    },
    robots: { fetched: true, blockedBots: [], raw: "User-agent: *\nAllow: /\n" },
    llmsTxt: false,
    titleMentionsTown: true,
    metaMentionsTown: false,
    speed: { ttfbMs: 310, htmlKb: 96 },
  };
  const gbp = (name: string, reviews: number, rating: number): GoogleBusinessSignal => ({
    found: true,
    placeId: null,
    name,
    rating,
    reviewCount: reviews,
    recentReviews90d: Math.round(reviews / 30),
    categories: ["Real estate agency"],
    completeness: 90,
    missingFields: [],
  });
  const signals: Record<string, unknown>[] = [
    { org_id: org.id, branch_id: branch.id, scan_run_id: lastRunId, type: "website_crawl", value_json: crawl },
    { org_id: org.id, branch_id: branch.id, scan_run_id: lastRunId, type: "google_business", value_json: gbp(YOU.name, 86, 4.6) },
    ...[
      ["Fenwick Ashby", 412, 4.7],
      ["Linden & Rowe", 356, 4.8],
      ["Marsh Lettings", 438, 4.5],
      ["Calder Moore", 301, 4.6],
    ].map(([n, r, g]) => ({
      org_id: org.id,
      competitor_id: compId.get(n as string),
      scan_run_id: lastRunId,
      type: "google_business",
      value_json: gbp(n as string, r as number, g as number),
    })),
  ];
  must(await db().from("signals").insert(signals), "insert signals");

  // --- Fixes from the real rule engine, plus hand-written example drafts -----
  await generateRecommendations(branch, { runId: lastRunId, budget: new RunBudget(null, 0, 0), generateAssets: false });
  const DRAFTS: Record<string, string> = {
    faq: [
      "> Draft generated by Privett from your data. Check every detail before publishing.",
      "",
      "## Selling with Harbour & Hale",
      "",
      "**Who should I sell my house with in Southsea?**",
      "We're an independent Southsea agent. We'll value your home using recent sales on your street and tell you honestly what it's worth. [CHECK: add your average time to sell]",
      "",
      "**How accurate are your valuations?**",
      "Every valuation is done in person by someone who sells homes in your area each week. [CHECK: add the share of homes sold at or above asking price]",
      "",
      "**Do you let properties in Eastney?**",
      "Yes. We manage homes across Eastney, Milton and Albert Road for landlords who want a local, responsive team.",
    ].join("\n"),
    "area-page": [
      "> Draft generated by Privett from your data. Check every detail before publishing.",
      "",
      "# Living in Eastney",
      "",
      "Eastney sits at the quieter eastern end of Southsea, close to the seafront and the marina. [CHECK: add typical house prices and the main property types]",
      "",
      "## Selling in Eastney",
      "We sell homes in Eastney every month and know which streets buyers ask for first. [CHECK: add a recent sale you can mention]",
    ].join("\n"),
  };
  const recs = must(await db().from("recommendations").select("id, asset_kind, asset_status").eq("branch_id", branch.id), "recs") as { id: string; asset_kind: string | null; asset_status: string }[];
  for (const r of recs) {
    if (r.asset_status === "pending" && r.asset_kind && DRAFTS[r.asset_kind]) {
      await db().from("recommendations").update({ asset_text: DRAFTS[r.asset_kind], asset_status: "ready" }).eq("id", r.id);
    }
  }

  // --- Weekly rollups for every scan -----------------------------------------
  const runs = must(await db().from("scan_runs").select("id").eq("branch_id", branch.id), "runs") as { id: string }[];
  for (const r of runs) await updateRollups(branch.id, org.id, r.id);

  // --- A few website visits from AI ------------------------------------------
  const sources = ["chatgpt", "chatgpt", "perplexity", "gemini", "chatgpt", "claude", "perplexity", "copilot"];
  const paths = ["/", "/valuation", "/areas/albert-road", "/sell", "/landlords", "/areas/milton"];
  must(
    await db()
      .from("referral_events")
      .insert(Array.from({ length: 23 }, (_, i) => ({ org_id: org.id, branch_id: branch.id, source: sources[i % sources.length], landing_path: paths[i % paths.length], ts: new Date(now - between(1, 28) * DAY).toISOString() }))),
    "referrals",
  );

  console.log(`recommendations: ${recs.length}`);
  console.log(`DEMO_BRANCH_ID=${branch.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
