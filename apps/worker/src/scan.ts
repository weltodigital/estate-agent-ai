// One scan run: prompts x engines x runs -> stored answers -> parsed ->
// matched -> mentions and citations. Branch runs then snapshot signals,
// refresh recommendations and roll up weekly metrics. League runs match
// against an admin-supplied list of agents in a town.
//
// Runs are resumable: answers already stored for a run are skipped, and
// answers stored but not yet parsed are parsed on the next attempt.

import {
  domainMatches,
  effectiveLimits,
  getEngineConfigs,
  getPlans,
  matchAgent,
  normaliseAgentName,
  normaliseDomain,
  renderPromptsForBranch,
  type EngineId,
  type IntentGroup,
  type MatchTarget,
  type ParsedAnswer,
  type PromptTemplate,
} from "@privett/core";
import { BudgetExceededError, CALL_ESTIMATE_USD, RunBudget } from "./cost";
import { db, fetchAll, insertChunked, must } from "./db";
import { availableEngines, EngineError, runPrompt } from "./engines";
import { env } from "./env";
import { errMessage, log } from "./log";
import { parseAnswer } from "./parse";
import { generateRecommendations } from "./recommendations";
import { updateRollups } from "./rollups";
import { collectSignals, type SignalSubject } from "./signals";
import { Mutex, runPool } from "./util/pool";

export interface ScanRunRow {
  id: string;
  org_id: string | null;
  branch_id: string | null;
  league_table_id: string | null;
  kind: "scheduled" | "manual" | "free" | "league";
  status: string;
  engines: string[];
  runs_per_prompt: number;
  budget_usd: number | string;
  cost_usd: number | string;
  attempts: number;
  max_attempts: number;
  started_at: string | null;
}

export interface BranchRow {
  id: string;
  org_id: string;
  name: string;
  aliases: string[];
  website: string | null;
  domain: string | null;
  town: string;
  areas: string[];
  postcode: string | null;
  place_id: string | null;
}

export interface CompetitorRow {
  id: string;
  name: string;
  normalised_name: string;
  aliases: string[];
  domain: string | null;
  place_id: string | null;
  status: "discovered" | "pinned" | "hidden";
}

interface Task {
  promptText: string;
  intentGroup: IntentGroup;
  branchPromptId: string | null;
  engine: EngineId;
  runIndex: number;
}

type KeyColumns = { is_branch: boolean; matched_competitor_id: string | null; matched_league_agent_id: string | null };

/** How a run maps agent names and cited domains onto its subjects. */
interface Matcher {
  targets: MatchTarget[];
  /** Town and areas, stripped from names before matching ("Hunters Stourbridge" = "Hunters"). */
  places: string[];
  /** Creates a new subject for an unmatched name and returns its key. */
  discover(name: string, domain: string | null): Promise<string>;
  columns(key: string | null): KeyColumns;
  citation(domain: string): { is_own_domain: boolean; competitor_id: string | null };
}

interface Scope {
  orgId: string | null;
  branchId: string | null;
  town: string | null;
}

// ---------------------------------------------------------------------------
// Answer -> stored, parsed, matched
// ---------------------------------------------------------------------------

async function storeMatches(resultId: string, parsed: ParsedAnswer, citedUrls: string[], matcher: Matcher, scope: Scope, mutex: Mutex) {
  const mentionRows: Record<string, unknown>[] = [];
  let branchRow: { position: number; label: string; score: number; descriptors: string[]; confidence: string } | null = null;
  let needsReview = false;

  for (const agent of parsed.agents) {
    const normalised = normaliseAgentName(agent.name, matcher.places);
    // Discovery mutates the target list, so match + discover under one lock.
    const { key, confidence } = await mutex.run(async () => {
      const m = matchAgent({ name: agent.name, domain: agent.domain }, matcher.targets, matcher.places);
      if (m.confidence !== "none") return { key: m.key, confidence: m.confidence };
      return { key: await matcher.discover(agent.name, agent.domain), confidence: "high" as const };
    });
    if (confidence === "low") needsReview = true;
    const cols = matcher.columns(key);
    if (cols.is_branch && (!branchRow || confidence === "high")) {
      branchRow = { position: agent.position, label: agent.sentiment_label, score: agent.sentiment_score, descriptors: agent.descriptors, confidence };
    }
    mentionRows.push({
      scan_result_id: resultId,
      org_id: scope.orgId,
      branch_id: scope.branchId,
      agent_name: agent.name,
      normalised_name: normalised,
      position: agent.position,
      ...cols,
      match_confidence: confidence,
      sentiment_score: agent.sentiment_score,
      descriptors: agent.descriptors,
    });
  }

  const seen = new Set<string>();
  const citationRows: Record<string, unknown>[] = [];
  for (const url of citedUrls) {
    const domain = normaliseDomain(url);
    if (!domain || seen.has(url)) continue;
    seen.add(url);
    citationRows.push({ scan_result_id: resultId, org_id: scope.orgId, branch_id: scope.branchId, url, domain, ...matcher.citation(domain) });
  }

  if (mentionRows.length) await insertChunked("agent_mentions", mentionRows);
  if (citationRows.length) await insertChunked("citations", citationRows);

  // Only a high-confidence match counts as a mention; low ones wait for review.
  const high = branchRow?.confidence === "high" ? branchRow : null;
  must(
    await db()
      .from("scan_results")
      .update({
        parse_status: "ok",
        mentioned: !!high,
        position: high?.position ?? null,
        sentiment_label: high?.label ?? null,
        sentiment_score: high?.score ?? null,
        descriptors: high?.descriptors ?? [],
        match_confidence: branchRow?.confidence ?? "none",
        needs_review: needsReview,
        error: null,
      })
      .eq("id", resultId),
    "update scan_results",
  );
}

async function parseAndMatch(
  result: { id: string; prompt_text: string; answer_text: string; cited: string[] },
  ctx: { matcher: Matcher; scope: Scope; budget: RunBudget; mutex: Mutex },
) {
  const { parsed, error } = await parseAnswer(result.prompt_text, result.answer_text, ctx.budget);
  if (!parsed) {
    must(await db().from("scan_results").update({ parse_status: "failed", error }).eq("id", result.id), "update scan_results");
    return;
  }
  await storeMatches(result.id, parsed, result.cited, ctx.matcher, ctx.scope, ctx.mutex);
}

/** Runs every task not already stored for this run. Returns true if the budget stopped it early. */
async function runTasks(run: ScanRunRow, tasks: Task[], matcher: Matcher, scope: Scope, budget: RunBudget): Promise<boolean> {
  const mutex = new Mutex();
  const existing = await fetchAll<{ id: string; prompt_text: string; engine: string; run_index: number; parse_status: string; answer_text: string | null }>(
    (from, to) => db().from("scan_results").select("id, prompt_text, engine, run_index, parse_status, answer_text").eq("scan_run_id", run.id).range(from, to),
    "select existing scan_results",
  );
  const done = new Set(existing.map((r) => `${r.prompt_text}|${r.engine}|${r.run_index}`));
  const todo = tasks.filter((t) => !done.has(`${t.promptText}|${t.engine}|${t.runIndex}`));
  let stopped = false;
  let completed = tasks.length - todo.length;

  const progress = async () => {
    await db().from("scan_runs").update({ progress: { done: completed, total: tasks.length } }).eq("id", run.id);
  };

  // Resume: parse answers stored by an earlier attempt that never got parsed.
  const unparsed = existing.filter((r) => r.parse_status === "pending" && r.answer_text);
  for (const r of unparsed) {
    if (budget.exceeded) {
      stopped = true;
      break;
    }
    // Citations are only written after a successful parse; the extracted URLs live in raw_json.
    const raw = must(await db().from("scan_results").select("raw_json").eq("id", r.id).single(), "select raw_json") as { raw_json: { citedUrls?: string[] } | null };
    const cited = raw.raw_json?.citedUrls ?? [];
    try {
      await parseAndMatch({ id: r.id, prompt_text: r.prompt_text, answer_text: r.answer_text!, cited }, { matcher, scope, budget, mutex });
    } catch (err) {
      if (err instanceof BudgetExceededError) stopped = true;
      else throw err;
    }
  }
  await progress();

  const engineModels = getEngineConfigs();
  await runPool(
    todo,
    env.taskConcurrency,
    async (task) => {
      try {
        budget.check(CALL_ESTIMATE_USD.answer);
      } catch {
        stopped = true;
        return;
      }
      const base = {
        scan_run_id: run.id,
        org_id: scope.orgId,
        branch_id: scope.branchId,
        branch_prompt_id: task.branchPromptId,
        engine: task.engine,
        prompt_text: task.promptText,
        intent_group: task.intentGroup,
        run_index: task.runIndex,
      };
      let answer;
      try {
        answer = await runPrompt(task.engine, { prompt: task.promptText, town: scope.town });
      } catch (err) {
        // Keep the failure visible as evidence; it is excluded from metrics.
        log.warn("engine call failed", { run: run.id, engine: task.engine, err: errMessage(err) });
        must(
          await db().from("scan_results").insert({
            ...base,
            model: engineModels[task.engine].model,
            parse_status: "engine_error",
            error: errMessage(err).slice(0, 2000),
            raw_json: err instanceof EngineError ? (err.raw as object) : null,
          }),
          "insert scan_results",
        );
        completed++;
        return;
      }
      await budget.record({
        provider: task.engine,
        model: answer.model,
        purpose: "answer",
        inputTokens: answer.usage.inputTokens,
        outputTokens: answer.usage.outputTokens,
        costUsd: answer.costUsd,
      });
      const inserted = must(
        await db()
          .from("scan_results")
          .insert({
            ...base,
            model: answer.model,
            answer_text: answer.answerText,
            // Raw provider response plus the URLs we extracted from it.
            raw_json: { response: answer.raw, citedUrls: answer.citedUrls, usage: answer.usage },
            cost_usd: answer.costUsd,
            parse_status: "pending",
          })
          .select("id")
          .single(),
        "insert scan_results",
      ) as { id: string };
      try {
        await parseAndMatch(
          { id: inserted.id, prompt_text: task.promptText, answer_text: answer.answerText, cited: answer.citedUrls },
          { matcher, scope, budget, mutex },
        );
      } catch (err) {
        // Over budget: the answer stays stored as 'pending' and is parsed on a later attempt.
        if (err instanceof BudgetExceededError) stopped = true;
        else throw err;
      }
      completed++;
      if (completed % 5 === 0) await progress();
    },
    () => stopped,
  );
  await progress();
  return stopped;
}

// ---------------------------------------------------------------------------
// Branch runs
// ---------------------------------------------------------------------------

async function orgLimits(run: ScanRunRow) {
  if (run.kind === "free") return getPlans().free.limits;
  const subs = must(await db().from("subscriptions").select("plan_id, status, branch_quantity").eq("org_id", run.org_id), "select subscriptions") as {
    plan_id: string;
    status: string;
    branch_quantity: number;
  }[];
  return effectiveLimits(subs).limits;
}

function competitorMatcher(branch: BranchRow, competitors: CompetitorRow[]): Matcher {
  const byKey = new Map(competitors.map((c) => [c.id, c]));
  const targets: MatchTarget[] = [
    { key: "branch", name: branch.name, aliases: branch.aliases, domain: branch.domain },
    ...competitors.map((c) => ({ key: c.id, name: c.name, aliases: c.aliases, domain: c.domain })),
  ];
  const places = [branch.town, ...branch.areas];
  return {
    targets,
    places,
    async discover(name, domain) {
      const normalised = normaliseAgentName(name, places);
      const cleanDomain = normaliseDomain(domain);
      // Never let discovery claim the branch's own domain.
      const row = { org_id: branch.org_id, branch_id: branch.id, name, normalised_name: normalised, domain: domainMatches(cleanDomain, branch.domain) ? null : cleanDomain, status: "discovered" };
      await db().from("competitors").upsert(row, { onConflict: "branch_id,normalised_name", ignoreDuplicates: true });
      const c = must(
        await db().from("competitors").select("id, name, normalised_name, aliases, domain, place_id, status").eq("branch_id", branch.id).eq("normalised_name", normalised).single(),
        "select competitor",
      ) as CompetitorRow;
      byKey.set(c.id, c);
      targets.push({ key: c.id, name: c.name, aliases: c.aliases, domain: c.domain });
      return c.id;
    },
    columns(key) {
      return { is_branch: key === "branch", matched_competitor_id: key && key !== "branch" ? key : null, matched_league_agent_id: null };
    },
    citation(domain) {
      const comp = [...byKey.values()].find((c) => c.domain && domainMatches(domain, c.domain));
      return { is_own_domain: domainMatches(domain, branch.domain), competitor_id: comp?.id ?? null };
    },
  };
}

/** Competitors without a known domain: adopt a cited domain whose first label contains their name. */
async function inferCompetitorDomains(runId: string, branchId: string) {
  const comps = must(await db().from("competitors").select("id, normalised_name, domain").eq("branch_id", branchId).is("domain", null), "select competitors") as {
    id: string;
    normalised_name: string;
  }[];
  if (!comps.length) return;
  const cites = await fetchAll<{ domain: string }>(
    (from, to) => db().from("citations").select("domain, scan_results!inner(scan_run_id)").eq("branch_id", branchId).eq("scan_results.scan_run_id", runId).range(from, to),
    "select run citations",
  );
  const domains = [...new Set(cites.map((c) => c.domain))];
  for (const c of comps) {
    const compact = c.normalised_name.replace(/\s+/g, "");
    if (compact.length < 4) continue;
    const hit = domains.find((d) => (d.split(".")[0] ?? "").replace(/-/g, "").includes(compact));
    if (hit) await db().from("competitors").update({ domain: hit }).eq("id", c.id);
  }
}

/** Competitor visibility in this run, for choosing whose signals to snapshot. */
async function topCompetitorsThisRun(runId: string, limit: number): Promise<string[]> {
  const results = await fetchAll<{ id: string }>(
    (from, to) => db().from("scan_results").select("id").eq("scan_run_id", runId).eq("parse_status", "ok").range(from, to),
    "select run results",
  );
  const ids = results.map((r) => r.id);
  const counts = new Map<string, Set<string>>();
  for (let i = 0; i < ids.length; i += 200) {
    const rows = must(
      await db().from("agent_mentions").select("scan_result_id, matched_competitor_id").in("scan_result_id", ids.slice(i, i + 200)).eq("match_confidence", "high").not("matched_competitor_id", "is", null),
      "select mentions",
    ) as { scan_result_id: string; matched_competitor_id: string }[];
    for (const r of rows) {
      const set = counts.get(r.matched_competitor_id) ?? new Set();
      set.add(r.scan_result_id);
      counts.set(r.matched_competitor_id, set);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, limit).map(([id]) => id);
}

async function runBranchScan(run: ScanRunRow, budget: RunBudget): Promise<"completed" | "budget_exceeded"> {
  const branch = must(await db().from("branches").select("*").eq("id", run.branch_id).single(), "select branch") as BranchRow;
  const limits = await orgLimits(run);
  const prompts = must(
    await db().from("branch_prompts").select("id, text, intent_group, area").eq("branch_id", branch.id).eq("active", true).order("created_at").limit(limits.promptsPerBranch),
    "select branch_prompts",
  ) as { id: string; text: string; intent_group: IntentGroup; area: string | null }[];
  if (!prompts.length) throw new Error("Branch has no active prompts");
  const engines = availableEngines(run.engines);
  if (!engines.length) throw new Error("No engine API keys configured for this scan's engines");

  const competitors = must(
    await db().from("competitors").select("id, name, normalised_name, aliases, domain, place_id, status").eq("branch_id", branch.id),
    "select competitors",
  ) as CompetitorRow[];

  const tasks: Task[] = prompts.flatMap((p) =>
    engines.flatMap((engine) =>
      Array.from({ length: run.runs_per_prompt }, (_v, runIndex) => ({ promptText: p.text, intentGroup: p.intent_group, branchPromptId: p.id, engine, runIndex })),
    ),
  );
  const scope: Scope = { orgId: branch.org_id, branchId: branch.id, town: branch.town };
  const stopped = await runTasks(run, tasks, competitorMatcher(branch, competitors), scope, budget);

  await inferCompetitorDomains(run.id, branch.id).catch((err) => log.warn("domain inference failed", { err: errMessage(err) }));

  // Signals: the branch, then (paid scans) its most-named competitors.
  const promptAreas = prompts.map((p) => p.area).filter((a): a is string => !!a);
  const areas = [...new Set([...branch.areas, ...promptAreas])];
  const branchSubject: SignalSubject = { kind: "branch", id: branch.id, orgId: branch.org_id, name: branch.name, website: branch.website, domain: branch.domain, town: branch.town, areas, placeId: branch.place_id };
  await collectSignals(branchSubject, { runId: run.id, budget, places: true });
  if (run.kind !== "free") {
    const topIds = await topCompetitorsThisRun(run.id, 3);
    const fresh = must(await db().from("competitors").select("id, name, normalised_name, aliases, domain, place_id, status").in("id", topIds.length ? topIds : ["00000000-0000-0000-0000-000000000000"]), "select competitors") as CompetitorRow[];
    for (const c of fresh.filter((c) => c.status !== "hidden")) {
      await collectSignals(
        { kind: "competitor", id: c.id, orgId: branch.org_id, name: c.name, website: null, domain: c.domain, town: branch.town, areas, placeId: c.place_id },
        { runId: run.id, budget, places: true },
      );
    }
  }

  await generateRecommendations(branch, { runId: run.id, budget, generateAssets: true }).catch((err) =>
    log.error("recommendations failed", { run: run.id, err: errMessage(err) }),
  );
  await updateRollups(branch.id, branch.org_id, run.id).catch((err) => log.error("rollups failed", { run: run.id, err: errMessage(err) }));
  return stopped || budget.exceeded ? "budget_exceeded" : "completed";
}

// ---------------------------------------------------------------------------
// League runs (admin town league tables)
// ---------------------------------------------------------------------------

async function runLeagueScan(run: ScanRunRow, budget: RunBudget): Promise<"completed" | "budget_exceeded"> {
  const league = must(await db().from("league_tables").select("id, town, areas").eq("id", run.league_table_id).single(), "select league_table") as {
    id: string;
    town: string;
    areas: string[];
  };
  await db().from("league_tables").update({ status: "running" }).eq("id", league.id);
  const agents = must(await db().from("league_agents").select("id, name, aliases, domain").eq("league_table_id", league.id), "select league_agents") as {
    id: string;
    name: string;
    aliases: string[];
    domain: string | null;
  }[];
  const library = must(await db().from("prompts").select("id, template, intent_group, uses_area, sort_order").is("org_id", null).eq("active", true), "select prompts") as PromptTemplate[];
  const prompts = renderPromptsForBranch(library, { town: league.town, areas: league.areas }, 20);
  const engines = availableEngines(run.engines);
  if (!engines.length) throw new Error("No engine API keys configured for this scan's engines");

  const targets: MatchTarget[] = agents.map((a) => ({ key: a.id, name: a.name, aliases: a.aliases, domain: a.domain }));
  const places = [league.town, ...league.areas];
  const matcher: Matcher = {
    targets,
    places,
    async discover(name, domain) {
      const normalised = normaliseAgentName(name, places);
      await db().from("league_agents").upsert(
        { league_table_id: league.id, name, normalised_name: normalised, domain: normaliseDomain(domain) },
        { onConflict: "league_table_id,normalised_name", ignoreDuplicates: true },
      );
      const a = must(await db().from("league_agents").select("id, name, aliases, domain").eq("league_table_id", league.id).eq("normalised_name", normalised).single(), "select league_agent") as {
        id: string;
        name: string;
        aliases: string[];
        domain: string | null;
      };
      targets.push({ key: a.id, name: a.name, aliases: a.aliases, domain: a.domain });
      return a.id;
    },
    columns(key) {
      return { is_branch: false, matched_competitor_id: null, matched_league_agent_id: key };
    },
    citation() {
      return { is_own_domain: false, competitor_id: null };
    },
  };
  const tasks: Task[] = prompts.flatMap((p) =>
    engines.flatMap((engine) =>
      Array.from({ length: run.runs_per_prompt }, (_v, runIndex) => ({ promptText: p.text, intentGroup: p.intent_group, branchPromptId: null, engine, runIndex })),
    ),
  );
  const stopped = await runTasks(run, tasks, matcher, { orgId: null, branchId: null, town: league.town }, budget);
  await db().from("league_tables").update({ status: "completed" }).eq("id", league.id);
  return stopped || budget.exceeded ? "budget_exceeded" : "completed";
}

// ---------------------------------------------------------------------------

export async function processRun(run: ScanRunRow): Promise<void> {
  const budget = new RunBudget(run.id, Number(run.budget_usd), Number(run.cost_usd));
  const heartbeat = setInterval(() => {
    void db().from("scan_runs").update({ locked_at: new Date().toISOString() }).eq("id", run.id).eq("locked_by", env.workerId);
  }, env.heartbeatMs);
  try {
    const status = run.kind === "league" ? await runLeagueScan(run, budget) : await runBranchScan(run, budget);
    must(
      await db()
        .from("scan_runs")
        .update({ status, finished_at: new Date().toISOString(), locked_at: null, error: status === "budget_exceeded" ? "Stopped at the scan's cost cap" : null })
        .eq("id", run.id),
      "update scan_runs",
    );
    log.info("scan finished", { run: run.id, kind: run.kind, status, costUsd: budget.spentUsd });
  } finally {
    clearInterval(heartbeat);
  }
}

/** Marks a failed run for retry with backoff, or as failed for good. */
export async function failRun(run: ScanRunRow, err: unknown) {
  const message = errMessage(err).slice(0, 2000);
  const retry = run.attempts < run.max_attempts;
  const backoffMin = 2 ** run.attempts;
  await db()
    .from("scan_runs")
    .update(
      retry
        ? { status: "queued", locked_at: null, locked_by: null, error: message, scheduled_for: new Date(Date.now() + backoffMin * 60_000).toISOString() }
        : { status: "failed", locked_at: null, finished_at: new Date().toISOString(), error: message },
    )
    .eq("id", run.id);
  if (!retry && run.league_table_id) await db().from("league_tables").update({ status: "failed" }).eq("id", run.league_table_id);
  log.error("scan failed", { run: run.id, attempt: run.attempts, willRetry: retry, err: message });
}
