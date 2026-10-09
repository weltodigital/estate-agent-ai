// Builds the rule context from a branch's stored data, evaluates the rules
// in packages/core and upserts fix items by (branch, fingerprint). User status
// is never reset. After a fix is marked done, the next scan re-checks it:
// still firing -> 'still_present'; no longer firing -> 'resolved'.

import {
  BRANCH_KEY,
  computeSubjectMetrics,
  evaluateRules,
  getScanSettings,
  normaliseAgentName,
  perPromptMetrics,
  toMetricResponses,
  type GoogleBusinessSignal,
  type IntentGroup,
  type RecommendationDraft,
  type RuleCitationStat,
  type RuleCompetitor,
  type RuleContext,
  type RulePromptStat,
  type WebsiteCrawlSignal,
} from "@privett/core";
import { generateAsset } from "./assets";
import { BudgetExceededError, type RunBudget } from "./cost";
import { loadBranchData, type CitationRow, type MentionRow, type ResultRow } from "./data";
import { db, must } from "./db";
import { errMessage, log } from "./log";
import type { BranchRow } from "./scan";
import { latestSignals } from "./signals";

const WINDOW_DAYS = 30;

function topCounts(names: string[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const x of names) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

/** Lower-case alphanumeric tokens of a URL's host and path ("/agents/keats-fearn" -> agents, keats, fearn). */
function urlTokens(url: string): Set<string> {
  try {
    const u = new URL(url);
    return new Set(`${u.hostname} ${decodeURIComponent(u.pathname)}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  } catch {
    return new Set();
  }
}

/** True if the cited page is about this agent: every token of its normalised name is in the URL. */
function urlIsAbout(tokens: Set<string>, normalisedName: string): boolean {
  const name = normalisedName.split(" ").filter(Boolean);
  return name.length > 0 && name.every((t) => tokens.has(t));
}

/**
 * Per cited domain: whether any cited page is about the branch, and which
 * competitors it's cited for. A page is "about" an agent when the URL names
 * it (e.g. getagent.co.uk/.../keats-fearn). Being named in the same answer
 * isn't enough on its own: a visible agent co-occurs with every common
 * source, which hid real gaps. Competitors are also credited when they're
 * named in answers citing the domain that don't name the branch.
 */
export function buildCitationStats(
  results: ResultRow[],
  mentions: MentionRow[],
  citations: CitationRow[],
  competitorNames: Map<string, string>,
  branchNormalisedNames: string[],
  competitorNormalised: Map<string, string>,
): RuleCitationStat[] {
  const parsedIds = new Set(results.filter((r) => r.parse_status === "ok").map((r) => r.id));
  const mentionsByResult = new Map<string, MentionRow[]>();
  for (const m of mentions) {
    const list = mentionsByResult.get(m.scan_result_id) ?? [];
    list.push(m);
    mentionsByResult.set(m.scan_result_id, list);
  }
  const byDomain = new Map<string, CitationRow[]>();
  for (const c of citations) {
    if (c.is_own_domain || !parsedIds.has(c.scan_result_id)) continue;
    const list = byDomain.get(c.domain) ?? [];
    list.push(c);
    byDomain.set(c.domain, list);
  }

  return [...byDomain.entries()].map(([domain, rows]) => {
    let citesBranch = false;
    const comps = new Set<string>();
    for (const c of rows) {
      const tokens = urlTokens(c.url);
      if (branchNormalisedNames.some((n) => urlIsAbout(tokens, n))) citesBranch = true;
      for (const [id, norm] of competitorNormalised) {
        if (urlIsAbout(tokens, norm) && competitorNames.has(id)) comps.add(competitorNames.get(id)!);
      }
    }
    const resultIds = new Set(rows.map((c) => c.scan_result_id));
    for (const id of resultIds) {
      const ms = (mentionsByResult.get(id) ?? []).filter((m) => m.match_confidence === "high");
      if (ms.some((m) => m.is_branch)) continue;
      for (const m of ms) {
        if (m.matched_competitor_id && competitorNames.has(m.matched_competitor_id)) comps.add(competitorNames.get(m.matched_competitor_id)!);
      }
    }
    return { domain, responses: resultIds.size, citesBranch, competitorsCited: [...comps] };
  });
}

/** Can this rule's absence be trusted as "fixed"? Only if its inputs were available. */
function canDecide(ruleId: string, ctx: RuleContext): boolean {
  switch (ruleId) {
    case "review_gap":
      return !!ctx.gbp?.found && ctx.topCompetitors.filter((c) => c.gbp?.found).length >= 2;
    case "citation_gap":
      return ctx.totalResponses > 0;
    case "robots_blocks_ai":
      return !!ctx.crawl?.robots.fetched;
    default:
      return !!ctx.crawl?.ok;
  }
}

export async function buildRuleContext(branch: BranchRow): Promise<RuleContext> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
  const { results, mentions, citations } = await loadBranchData(branch.id, since);
  const responses = toMetricResponses(results, mentions);
  const threshold = getScanSettings().lowSampleThreshold;
  const branchMetrics = computeSubjectMetrics(responses, BRANCH_KEY, { lowSampleThreshold: threshold });

  const competitors = must(await db().from("competitors").select("id, name, domain, status").eq("branch_id", branch.id).neq("status", "hidden"), "select competitors") as {
    id: string;
    name: string;
    domain: string | null;
  }[];
  const names = new Map(competitors.map((c) => [c.id, c.name]));
  const places = [branch.town, ...branch.areas];
  const ranked = competitors
    .map((c) => ({ c, vis: computeSubjectMetrics(responses, c.id).visibility }))
    .filter((x) => (x.vis ?? 0) > 0)
    .sort((a, b) => (b.vis ?? 0) - (a.vis ?? 0))
    .slice(0, 5);
  const ids = ranked.map((x) => x.c.id);
  const [compCrawl, compGbp, branchCrawl, branchGbp] = await Promise.all([
    latestSignals<WebsiteCrawlSignal>("competitor_id", ids, "website_crawl"),
    latestSignals<GoogleBusinessSignal>("competitor_id", ids, "google_business"),
    latestSignals<WebsiteCrawlSignal>("branch_id", [branch.id], "website_crawl"),
    latestSignals<GoogleBusinessSignal>("branch_id", [branch.id], "google_business"),
  ]);
  const topCompetitors: RuleCompetitor[] = ranked.map(({ c, vis }) => ({
    id: c.id,
    name: c.name,
    domain: c.domain,
    visibility: vis,
    gbp: compGbp.get(c.id) ?? null,
    crawl: compCrawl.get(c.id) ?? null,
  }));

  const branchPrompts = must(await db().from("branch_prompts").select("text, intent_group, area").eq("branch_id", branch.id).eq("active", true), "select branch_prompts") as {
    text: string;
    intent_group: IntentGroup;
    area: string | null;
  }[];
  const perPrompt = new Map(perPromptMetrics(responses, BRANCH_KEY, { lowSampleThreshold: threshold }).map((p) => [p.promptText, p]));
  const promptOf = new Map(results.map((r) => [r.id, r.prompt_text]));
  const namedByPrompt = new Map<string, string[]>();
  for (const m of mentions) {
    if (m.is_branch) continue;
    const p = promptOf.get(m.scan_result_id);
    if (!p) continue;
    const list = namedByPrompt.get(p) ?? [];
    list.push(m.matched_competitor_id ? (names.get(m.matched_competitor_id) ?? m.agent_name) : m.agent_name);
    namedByPrompt.set(p, list);
  }
  const prompts: RulePromptStat[] = branchPrompts.map((bp) => {
    const m = perPrompt.get(bp.text);
    return {
      text: bp.text,
      intentGroup: bp.intent_group,
      area: bp.area,
      responses: m?.responses ?? 0,
      visibility: m?.visibility ?? null,
      namedInstead: topCounts(namedByPrompt.get(bp.text) ?? [], 3),
    };
  });

  return {
    branch: { id: branch.id, name: branch.name, domain: branch.domain, website: branch.website, town: branch.town, areas: branch.areas, postcode: branch.postcode },
    crawl: branchCrawl.get(branch.id) ?? null,
    gbp: branchGbp.get(branch.id) ?? null,
    topCompetitors,
    prompts,
    citations: buildCitationStats(
      results,
      mentions,
      citations,
      names,
      [branch.name, ...branch.aliases].map((n) => normaliseAgentName(n, places)),
      new Map(competitors.map((c) => [c.id, normaliseAgentName(c.name, places)])),
    ),
    branchVisibility: branchMetrics.visibility,
    totalResponses: branchMetrics.responses,
  };
}

interface ExistingRec {
  id: string;
  fingerprint: string;
  rule_id: string;
  status: "todo" | "done" | "dismissed";
  asset_status: string;
  asset_text: string | null;
  verified_result: string | null;
}

export async function generateRecommendations(branch: BranchRow, opts: { runId: string; budget: RunBudget; generateAssets: boolean }) {
  const ctx = await buildRuleContext(branch);
  const weightRows = must(await db().from("rule_weights").select("rule_id, weight"), "select rule_weights") as { rule_id: string; weight: number | string }[];
  const drafts = evaluateRules(ctx, Object.fromEntries(weightRows.map((w) => [w.rule_id, Number(w.weight)])));

  const existing = must(
    await db().from("recommendations").select("id, fingerprint, rule_id, status, asset_status, asset_text, verified_result").eq("branch_id", branch.id),
    "select recommendations",
  ) as ExistingRec[];
  const byFp = new Map(existing.map((r) => [r.fingerprint, r]));
  const now = new Date().toISOString();
  const fired = new Set<string>();

  for (const d of drafts) {
    fired.add(d.fingerprint);
    const prev = byFp.get(d.fingerprint);
    const fields: Record<string, unknown> = {
      rule_id: d.ruleId,
      rule_version: d.ruleVersion,
      title: d.title,
      why: d.why,
      priority: d.priority,
      effort: d.effort,
      evidence_json: d.evidence,
      asset_kind: d.asset?.kind ?? null,
      updated_at: now,
    };
    let toGenerate: RecommendationDraft["asset"] | null = null;
    if (!d.asset) {
      fields.asset_status = "none";
      fields.asset_text = null;
    } else if ("text" in d.asset) {
      fields.asset_text = d.asset.text;
      fields.asset_status = "ready";
    } else if (!(prev?.asset_status === "ready" && prev.asset_text)) {
      // Generated assets are kept once ready; otherwise (re)generate.
      fields.asset_status = "pending";
      toGenerate = d.asset;
    }
    if (prev?.status === "done") {
      fields.verified_at = now;
      fields.verified_result = "still_present";
    } else if (prev) {
      fields.verified_at = null;
      fields.verified_result = null;
    }

    let id = prev?.id;
    if (prev) {
      must(await db().from("recommendations").update(fields).eq("id", prev.id), "update recommendation");
    } else {
      const row = must(
        await db()
          .from("recommendations")
          .insert({ ...fields, org_id: branch.org_id, branch_id: branch.id, fingerprint: d.fingerprint, status: "todo" })
          .select("id")
          .single(),
        "insert recommendation",
      ) as { id: string };
      id = row.id;
    }

    if (toGenerate && "generate" in toGenerate && opts.generateAssets && id) {
      try {
        const text = await generateAsset(toGenerate.generate, opts.budget);
        await db().from("recommendations").update({ asset_text: text, asset_status: "ready" }).eq("id", id);
      } catch (err) {
        // Over budget stays 'pending' and is retried on the next scan.
        if (!(err instanceof BudgetExceededError)) {
          log.warn("asset generation failed", { rec: id, err: errMessage(err) });
          await db().from("recommendations").update({ asset_status: "failed" }).eq("id", id);
        }
      }
    }
  }

  // Items that no longer fire, where we had the data to know.
  for (const r of existing) {
    if (fired.has(r.fingerprint) || r.verified_result === "resolved" || !canDecide(r.rule_id, ctx)) continue;
    must(await db().from("recommendations").update({ verified_at: now, verified_result: "resolved" }).eq("id", r.id), "resolve recommendation");
  }
  log.info("recommendations updated", { branch: branch.id, fired: drafts.length });
}
