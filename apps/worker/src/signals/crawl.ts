// Website crawl -> WebsiteCrawlSignal. Polite: identified user agent,
// timeouts, a page cap, a size cap, same-host links only.

import * as cheerio from "cheerio";
import { AI_BOTS, normaliseDomain, type WebsiteCrawlSignal } from "@privett/core";
import { env } from "../env";
import { analyseJsonLd } from "./jsonld";
import { classifyPage, isAreaPage, linkPriority } from "./pages";
import { blockedAiBots } from "./robots";

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 15_000;

interface FetchedPage {
  url: string;
  status: number;
  html: string;
  ttfbMs: number;
  bytes: number;
}

async function fetchText(url: string): Promise<FetchedPage | null> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "user-agent": env.userAgent, accept: "text/html,text/plain;q=0.9,*/*;q=0.5" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ttfbMs = Date.now() - started;
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    const html = Buffer.concat(chunks).toString("utf8");
    return { url: res.url || url, status: res.status, html, ttfbMs, bytes };
  } catch {
    return null;
  }
}

export interface CrawlInput {
  website: string;
  town: string;
  areas: string[];
}

function pageInfo($: cheerio.CheerioAPI) {
  return {
    title: $("title").first().text().trim(),
    headings: $("h1, h2").map((_i, el) => $(el).text().trim()).get().slice(0, 20),
    meta: $('meta[name="description"]').attr("content")?.trim() ?? "",
    jsonLd: $('script[type="application/ld+json"]').map((_i, el) => $(el).contents().text()).get(),
  };
}

export async function crawlWebsite(input: CrawlInput): Promise<WebsiteCrawlSignal> {
  const raw = /^https?:\/\//i.test(input.website) ? input.website : `https://${input.website}`;
  let homepageUrl = raw;
  try {
    homepageUrl = new URL(raw).toString();
  } catch {
    // Left as given; the fetch below reports it as unreachable.
  }
  const empty: WebsiteCrawlSignal = {
    ok: false,
    homepageUrl,
    fetchedPages: 0,
    schema: { types: [], hasRealEstateAgent: false, hasLocalBusiness: false, hasAddress: false, hasAggregateRating: false, valid: false, errors: [] },
    pages: { areaPages: input.areas.map((area) => ({ area, url: null })), faqUrl: null, teamUrl: null, feesUrl: null, valuationUrl: null },
    robots: { fetched: false, blockedBots: [], raw: null },
    llmsTxt: false,
    titleMentionsTown: false,
    metaMentionsTown: false,
    speed: { ttfbMs: null, htmlKb: null },
  };

  const home = await fetchText(homepageUrl);
  if (!home || home.status >= 400) {
    return { ...empty, error: home ? `Homepage returned HTTP ${home.status}` : "Homepage could not be fetched" };
  }
  const base = new URL(home.url);
  const host = normaliseDomain(base.hostname);
  const $home = cheerio.load(home.html);
  const homeInfo = pageInfo($home);
  const townRe = new RegExp(`\\b${input.town.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

  // Rank internal links, then fetch the best few.
  const candidates = new Map<string, number>();
  $home("a[href]").each((_i, el) => {
    const href = $home(el).attr("href");
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return;
    let u: URL;
    try {
      u = new URL(href, base);
    } catch {
      return;
    }
    if (normaliseDomain(u.hostname) !== host || /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?)$/i.test(u.pathname)) return;
    u.hash = "";
    const key = u.toString();
    if (key === base.toString()) return;
    const p = linkPriority(u.pathname, $home(el).text().trim(), input.areas);
    candidates.set(key, Math.max(candidates.get(key) ?? 0, p));
  });
  const toFetch = [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, env.crawlMaxPages)
    .map(([u]) => u);

  const pages: { url: string; title: string; headings: string[]; jsonLd: string[] }[] = [
    { url: home.url, title: homeInfo.title, headings: homeInfo.headings, jsonLd: homeInfo.jsonLd },
  ];
  for (let i = 0; i < toFetch.length; i += 4) {
    const batch = await Promise.all(toFetch.slice(i, i + 4).map(fetchText));
    for (const p of batch) {
      if (!p || p.status >= 400) continue;
      const info = pageInfo(cheerio.load(p.html));
      pages.push({ url: p.url, title: info.title, headings: info.headings, jsonLd: info.jsonLd });
    }
  }

  const found: Record<"faq" | "team" | "fees" | "valuation", string | null> = { faq: null, team: null, fees: null, valuation: null };
  for (const p of pages.slice(1)) {
    for (const kind of classifyPage(p.url, p.title, p.headings)) found[kind] ??= p.url;
  }
  const areaPages = input.areas.map((area) => ({
    area,
    url: pages.slice(1).find((p) => isAreaPage(area, p.url, p.title, p.headings))?.url ?? null,
  }));

  // Schema: homepage plus any other page carrying JSON-LD.
  const schema = analyseJsonLd(pages.flatMap((p) => p.jsonLd));

  const robotsRes = await fetchText(new URL("/robots.txt", base).toString());
  const robotsRaw = robotsRes && robotsRes.status < 400 && !/<html/i.test(robotsRes.html) ? robotsRes.html : null;
  const llms = await fetchText(new URL("/llms.txt", base).toString());
  const llmsTxt = !!llms && llms.status === 200 && llms.html.trim().length > 0 && !/<(html|!doctype)/i.test(llms.html.slice(0, 500));

  return {
    ok: true,
    homepageUrl: home.url,
    fetchedPages: pages.length,
    schema,
    pages: { areaPages, faqUrl: found.faq, teamUrl: found.team, feesUrl: found.fees, valuationUrl: found.valuation },
    robots: { fetched: robotsRes !== null && robotsRes.status < 500, blockedBots: robotsRaw ? blockedAiBots(robotsRaw, AI_BOTS) : [], raw: robotsRaw?.slice(0, 20_000) ?? null },
    llmsTxt,
    titleMentionsTown: townRe.test(homeInfo.title),
    metaMentionsTown: townRe.test(homeInfo.meta),
    speed: { ttfbMs: home.ttfbMs, htmlKb: Math.round(home.bytes / 1024) },
  };
}
