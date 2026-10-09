import "server-only";
import {
  toMetricResponses,
  type AgentMentionRow,
  type GoogleBusinessSignal,
  type MetricResponse,
  type ScanResultRow,
} from "@privett/core";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAll } from "./paginate";

// All loaders use the user's client, so RLS scopes every read to their org.

export interface MentionRow extends AgentMentionRow {
  agent_name: string;
}

export interface ResultWithMentions extends ScanResultRow {
  needs_review: boolean;
  agent_mentions: MentionRow[];
}

const RESULT_COLUMNS =
  "id, engine, intent_group, created_at, prompt_text, parse_status, needs_review, agent_mentions(scan_result_id, agent_name, normalised_name, position, is_branch, matched_competitor_id, matched_league_agent_id, match_confidence, sentiment_score, descriptors)";

/** Every response for a branch since `from` (ISO), with its agent mentions. */
export async function loadBranchResults(branchId: string, from: string): Promise<ResultWithMentions[]> {
  const supabase = await getSupabaseServerClient();
  return fetchAll<ResultWithMentions>((a, b) =>
    supabase
      .from("scan_results")
      .select(RESULT_COLUMNS)
      .eq("branch_id", branchId)
      .gte("created_at", from)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(a, b),
  );
}

export function toResponses(rows: ResultWithMentions[]): MetricResponse[] {
  return toMetricResponses(
    rows,
    rows.flatMap((r) => r.agent_mentions ?? []),
  );
}

export interface CompetitorRow {
  id: string;
  name: string;
  domain: string | null;
  status: "discovered" | "pinned" | "hidden";
  first_seen_at: string;
}

export async function loadCompetitors(branchId: string): Promise<CompetitorRow[]> {
  const supabase = await getSupabaseServerClient();
  return fetchAll<CompetitorRow>((a, b) =>
    supabase
      .from("competitors")
      .select("id, name, domain, status, first_seen_at")
      .eq("branch_id", branchId)
      .order("name")
      .range(a, b),
  );
}

export interface RecommendationRow {
  id: string;
  rule_id: string;
  title: string;
  why: string;
  priority: number;
  effort: "S" | "M" | "L";
  evidence_json: Record<string, unknown>;
  asset_kind: string | null;
  asset_text: string | null;
  asset_status: string;
  status: "todo" | "done" | "dismissed";
  completed_at: string | null;
  verified_at: string | null;
  verified_result: string | null;
  first_seen_at: string;
  updated_at: string;
}

export async function loadRecommendations(branchId: string): Promise<RecommendationRow[]> {
  const supabase = await getSupabaseServerClient();
  return fetchAll<RecommendationRow>((a, b) =>
    supabase
      .from("recommendations")
      .select(
        "id, rule_id, title, why, priority, effort, evidence_json, asset_kind, asset_text, asset_status, status, completed_at, verified_at, verified_result, first_seen_at, updated_at",
      )
      .eq("branch_id", branchId)
      .order("priority")
      .order("first_seen_at")
      .range(a, b),
  );
}

export interface ScanRunRow {
  id: string;
  kind: string;
  status: "queued" | "running" | "completed" | "failed" | "budget_exceeded";
  engines: string[];
  progress: { done?: number; total?: number } | null;
  scheduled_for: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  created_at: string;
}

export async function loadRecentRuns(branchId: string, limit = 5): Promise<ScanRunRow[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("scan_runs")
    .select("id, kind, status, engines, progress, scheduled_for, started_at, finished_at, error, created_at")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ScanRunRow[];
}

/** Latest Google Business signal for the branch and each competitor. */
export async function loadLatestGbp(branchId: string, competitorIds: string[]) {
  const supabase = await getSupabaseServerClient();
  const branchQ = supabase
    .from("signals")
    .select("value_json, captured_at")
    .eq("branch_id", branchId)
    .eq("type", "google_business")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const competitor = new Map<string, GoogleBusinessSignal>();
  if (competitorIds.length) {
    // Newest first, so the first row seen per competitor is its latest.
    const rows = await fetchAll<{ competitor_id: string; value_json: GoogleBusinessSignal }>((a, b) =>
      supabase
        .from("signals")
        .select("competitor_id, value_json")
        .in("competitor_id", competitorIds.slice(0, 300))
        .eq("type", "google_business")
        .order("captured_at", { ascending: false })
        .range(a, b),
    );
    for (const r of rows) if (!competitor.has(r.competitor_id)) competitor.set(r.competitor_id, r.value_json);
  }
  const { data: own } = await branchQ;
  return { branch: (own?.value_json as GoogleBusinessSignal | undefined) ?? null, competitor };
}

/** Answer text for a handful of responses (for snippets and previews). */
export async function loadAnswerTexts(ids: string[]): Promise<Map<string, { answer_text: string | null; model: string }>> {
  const out = new Map<string, { answer_text: string | null; model: string }>();
  if (!ids.length) return out;
  const supabase = await getSupabaseServerClient();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase
      .from("scan_results")
      .select("id, answer_text, model")
      .in("id", ids.slice(i, i + 100));
    for (const r of data ?? []) out.set(r.id as string, { answer_text: r.answer_text as string | null, model: r.model as string });
  }
  return out;
}

export interface CitationRow {
  scan_result_id: string;
  url: string;
  domain: string;
  is_own_domain: boolean;
  competitor_id: string | null;
}

export async function loadCitations(branchId: string, resultIds: Set<string>): Promise<CitationRow[]> {
  const supabase = await getSupabaseServerClient();
  const rows = await fetchAll<CitationRow>((a, b) =>
    supabase
      .from("citations")
      .select("scan_result_id, url, domain, is_own_domain, competitor_id")
      .eq("branch_id", branchId)
      .order("id")
      .range(a, b),
  );
  return rows.filter((r) => resultIds.has(r.scan_result_id));
}

export interface ActivePrompt {
  id: string;
  text: string;
  intent_group: string;
  area: string | null;
}

export async function loadActivePrompts(branchId: string): Promise<ActivePrompt[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("branch_prompts")
    .select("id, text, intent_group, area")
    .eq("branch_id", branchId)
    .eq("active", true)
    .order("created_at");
  return (data ?? []) as ActivePrompt[];
}

export interface ReferralRow {
  source: string;
  landing_path: string;
  ts: string;
}

export async function loadReferrals(branchId: string, from: string): Promise<ReferralRow[]> {
  const supabase = await getSupabaseServerClient();
  return fetchAll<ReferralRow>((a, b) =>
    supabase
      .from("referral_events")
      .select("source, landing_path, ts")
      .eq("branch_id", branchId)
      .gte("ts", from)
      .order("ts")
      .range(a, b),
  );
}

export async function loadLastReferral(branchId: string): Promise<string | null> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("referral_events")
    .select("ts")
    .eq("branch_id", branchId)
    .order("ts", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.ts as string | undefined) ?? null;
}
