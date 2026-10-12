// Cited sources: which sites are agencies' own websites, and which cited
// pages are about whom. Shared by the worker's fix rules and the dashboard so
// both report the same gaps.

import { domainMatches, normaliseDomain } from "./text";

/**
 * Portals, directories, review sites, social networks and public bodies.
 * Never an agency's own website, even when an answer links an agency to one.
 */
const NON_AGENT_DOMAINS = [
  "rightmove.co.uk", "zoopla.co.uk", "onthemarket.com", "primelocation.com", "home.co.uk", "homemove.com",
  "getagent.co.uk", "allagents.co.uk", "agentseeker.co.uk", "compareagents.co.uk", "yably.co.uk", "thinkproperty.co.uk",
  "estateagentsranked.co.uk", "housesimple.com", "nimblefins.co.uk", "which.co.uk", "moneysavingexpert.com",
  "trustpilot.com", "reviews.co.uk", "reviews.io", "feefo.com", "yell.com", "thomsonlocal.com", "192.com", "cylex-uk.co.uk",
  "google.com", "google.co.uk", "maps.app.goo.gl", "facebook.com", "instagram.com", "linkedin.com", "x.com", "twitter.com",
  "youtube.com", "tiktok.com", "reddit.com", "wikipedia.org", "bbc.co.uk", "theguardian.com", "propertyindustryeye.com",
  "britishpropertyawards.co.uk", "estateagenttoday.co.uk", "companieshouse.gov.uk", "find-and-update.company-information.service.gov.uk",
];
const NON_AGENT_SUFFIXES = [".gov.uk", ".ac.uk", ".nhs.uk", ".police.uk", ".sch.uk"];

export function isNonAgentDomain(domain: string | null | undefined): boolean {
  const d = normaliseDomain(domain ?? null);
  if (!d) return true;
  return NON_AGENT_DOMAINS.some((n) => domainMatches(d, n)) || NON_AGENT_SUFFIXES.some((s) => d.endsWith(s));
}

const compact = (s: string) => s.replace(/[^a-z0-9]/g, "");

/** True if the domain's first label plausibly belongs to an agency with this normalised name. */
export function domainResemblesName(domain: string, normalisedName: string, rawName?: string): boolean {
  const label = compact((normaliseDomain(domain) ?? "").split(".")[0] ?? "");
  if (!label) return false;
  const whole = compact(normalisedName);
  if (whole.length >= 4 && label.includes(whole)) return true;
  // The full trading name, before generic words are dropped: "lklettingsco.com"
  // for "LK Lettings Co.".
  const raw = compact((rawName ?? "").toLowerCase().replace(/&/g, "and"));
  if (raw.length >= 6 && label.includes(raw)) return true;
  // Or its most distinctive word: "andrewlodge.net" for "andrew lodge".
  const words = normalisedName.split(" ");
  if (words.filter((w) => w.length >= 5).some((w) => label.includes(w))) return true;
  // Or an initial plus the next word: "hmorley.co.uk" for "Howard Morley & Sons".
  for (let i = 0; i + 1 < words.length; i++) {
    const next = words[i + 1]!;
    if (next.length >= 4 && label.startsWith(`${words[i]![0] ?? ""}${next}`)) return true;
  }
  // Or a short word standing alone in a hyphenated label: "tlc-farnham.co.uk"
  // for "Trueman Letting Company (TLC)".
  const parts = new Set(((normaliseDomain(domain) ?? "").split(".")[0] ?? "").split("-"));
  return parts.size > 1 && words.some((w) => w.length >= 3 && parts.has(w));
}

/**
 * The domain to store for an agency, or null. The parser reports the site an
 * answer linked an agent to, which is often a portal or directory page.
 */
export function agencyDomainFor(normalisedName: string, domain: string | null | undefined): string | null {
  const d = normaliseDomain(domain ?? null);
  if (!d || isNonAgentDomain(d) || !domainResemblesName(d, normalisedName)) return null;
  return d;
}

// ---------------------------------------------------------------------------
// Attribution
// ---------------------------------------------------------------------------

export interface CitationIn {
  resultId: string;
  url: string;
  domain: string;
  isOwnDomain: boolean;
}

export interface ResultNames {
  /** The branch is named in this response (high confidence). */
  branch: boolean;
  /** Competitor ids named in this response (high confidence). */
  competitorIds: string[];
}

export interface CitationSubject {
  id: string;
  normalisedName: string;
  domain: string | null;
  /** The name as written, for matching sites like "lklettingsco.com". */
  name?: string;
}

// URL paths that only an estate or letting agency's own site has.
const AGENCY_PATH = /(property-for-sale|properties-for-sale|for-sale|to-let|to-rent|property-to-rent|lettings|valuation|our-branches|branches|our-offices|estate-agents-in|sold-properties|landlords)/;

/** Pages on this site look like an agency's own (listings, valuations, branches). */
export function looksLikeAgencySite(urls: string[]): boolean {
  let hits = 0;
  for (const u of urls) {
    try {
      if (AGENCY_PATH.test(new URL(u).pathname.toLowerCase())) hits++;
    } catch {
      // ignore malformed URLs
    }
  }
  return hits >= 2;
}

export interface CitationAttribution {
  domain: string;
  /** Distinct responses citing this domain. */
  responses: number;
  /** A cited page is the branch's own site or a page about the branch. */
  citesBranch: boolean;
  /** Competitors this source is cited for: pages about them, plus those named in answers citing it that don't name the branch. */
  competitorIds: string[];
  /** Competitors with a cited page about them (or whose site this is). */
  aboutIds: string[];
  /** The site of a competitor or another agency: not somewhere to get listed. */
  isAgentSite: boolean;
  /** Competitors whose own site this is. */
  ownerIds: string[];
  /** Distinct cited URLs on this site. */
  urls: string[];
  /** Distinct responses citing this domain that also name the branch. */
  responsesNamingBranch: number;
  sampleResultId: string;
}

/** One row per site: "uk.trustpilot.com" and "www.trustpilot.com" are both trustpilot.com. */
export function siteKey(domain: string): string {
  return (normaliseDomain(domain) ?? domain.toLowerCase()).replace(/^(uk|en|m|en-gb)\./, "");
}

function urlTokens(url: string): Set<string> {
  try {
    const u = new URL(url);
    return new Set(`${u.hostname} ${decodeURIComponent(u.pathname)}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  } catch {
    return new Set();
  }
}

/** The cited page names the agent: every word of its normalised name is in the URL. */
function urlIsAbout(tokens: Set<string>, normalisedName: string): boolean {
  const words = normalisedName.split(" ").filter(Boolean);
  return words.length > 0 && words.every((w) => tokens.has(w));
}

/**
 * Per cited domain: is it about the branch, which competitors it's cited for,
 * and is it an agency's own site.
 *
 * A source cites an agent when the cited page is about it (its URL names the
 * agent, e.g. rightmove.co.uk/estate-agents/agent/Keats-Fearn/...). Being named
 * in the same answer isn't enough: a visible agent co-occurs with every common
 * source. Competitors are also credited when named in answers citing the
 * source that don't name the branch.
 */
export function attributeCitations(
  citations: CitationIn[],
  namesByResult: Map<string, ResultNames>,
  branch: { normalisedNames: string[]; domain: string | null },
  competitors: CitationSubject[],
): CitationAttribution[] {
  const byDomain = new Map<string, CitationIn[]>();
  for (const c of citations) {
    const d = siteKey(c.domain);
    const list = byDomain.get(d) ?? [];
    list.push(c);
    byDomain.set(d, list);
  }

  return [...byDomain.entries()]
    .map(([domain, rows]) => {
      let citesBranch = rows.some((c) => c.isOwnDomain) || domainMatches(domain, branch.domain);
      const about = new Set<string>();
      for (const c of rows) {
        const tokens = urlTokens(c.url);
        if (branch.normalisedNames.some((n) => urlIsAbout(tokens, n))) citesBranch = true;
        for (const s of competitors) if (urlIsAbout(tokens, s.normalisedName)) about.add(s.id);
      }
      const ownerComps = competitors.filter(
        (s) =>
          (s.domain && domainMatches(domain, s.domain)) ||
          (!isNonAgentDomain(domain) && domainResemblesName(domain, s.normalisedName, s.name)),
      );
      const urls = [...new Set(rows.map((c) => c.url))];
      for (const s of ownerComps) about.add(s.id);
      const comps = new Set(about);

      const resultIds = [...new Set(rows.map((c) => c.resultId))];
      let namingBranch = 0;
      for (const id of resultIds) {
        const n = namesByResult.get(id);
        if (!n) continue;
        if (n.branch) {
          namingBranch++;
          continue;
        }
        for (const cid of n.competitorIds) comps.add(cid);
      }
      return {
        domain,
        responses: resultIds.length,
        citesBranch,
        competitorIds: [...comps],
        aboutIds: [...about],
        // An unknown agency's site is still an agency site, never a listing gap.
        isAgentSite: ownerComps.length > 0 || (!isNonAgentDomain(domain) && looksLikeAgencySite(urls)),
        ownerIds: ownerComps.map((s) => s.id),
        urls,
        responsesNamingBranch: namingBranch,
        sampleResultId: resultIds[0]!,
      };
    })
    .sort((a, b) => b.responses - a.responses || a.domain.localeCompare(b.domain));
}

/** A gap: a third-party source cited for competitors but never for the branch. */
export function isCitationGap(a: Pick<CitationAttribution, "citesBranch" | "competitorIds" | "isAgentSite">): boolean {
  return !a.citesBranch && !a.isAgentSite && a.competitorIds.length > 0;
}

// ---------------------------------------------------------------------------
// What kind of page did AI read on a competitor's site?
// ---------------------------------------------------------------------------

export type AgencyPageKind =
  | "valuation"
  | "reviews"
  | "team"
  | "fees"
  | "market"
  | "landlords"
  | "branch"
  | "area-guide"
  | "listings"
  | "home"
  | "other";

export const AGENCY_PAGE_LABEL: Record<AgencyPageKind, string> = {
  valuation: "valuation pages",
  reviews: "reviews pages",
  team: "team pages",
  fees: "fees pages",
  market: "news and market updates",
  landlords: "landlord pages",
  branch: "branch pages",
  "area-guide": "area guides",
  listings: "property pages",
  home: "homepage",
  other: "other pages",
};

/** Classifies a cited URL on an agency's site by its path. `places` are the town and areas. */
export function classifyAgencyPage(url: string, places: string[] = []): AgencyPageKind {
  let path: string;
  try {
    path = decodeURIComponent(new URL(url).pathname).toLowerCase();
  } catch {
    return "other";
  }
  if (path === "/" || path === "") return "home";
  const has = (re: RegExp) => re.test(path);
  if (has(/valu/)) return "valuation";
  if (has(/review|testimonial/)) return "reviews";
  if (has(/team|people|staff|meet-the|our-agents/)) return "team";
  if (has(/fee|charges|pricing/)) return "fees";
  if (has(/news|blog|market|insight|report|article/)) return "market";
  if (has(/landlord/)) return "landlords";
  if (has(/branch|office|estate-agents-in|letting-agents-in|contact/)) return "branch";
  const placeSlugs = places.map((p) => p.toLowerCase().replace(/[^a-z0-9]+/g, "-")).filter(Boolean);
  if (has(/area|guide|living-in|neighbourhood|community|local/) || placeSlugs.some((p) => path.includes(p))) return "area-guide";
  if (has(/propert|for-sale|to-let|to-rent|listing|homes/)) return "listings";
  return "other";
}
