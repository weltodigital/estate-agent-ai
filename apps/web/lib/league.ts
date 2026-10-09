import "server-only";
import { computeSubjectMetrics, getScanSettings, toMetricResponses, type AgentMentionRow, type ScanResultRow } from "@privett/core";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export interface LeagueRow {
  agentId: string;
  name: string;
  domain: string | null;
  responses: number;
  mentions: number;
  mentionRate: number | null;
  shareOfVoice: number | null;
  position: number | null;
  lowSample: boolean;
}

/**
 * League table for a town: mention rate and share of voice per listed agent,
 * from the latest completed league scan. Same formulas as the dashboard.
 */
export async function loadLeagueTable(id: string) {
  const admin = getSupabaseAdminClient();
  const { data: table } = await admin.from("league_tables").select("*").eq("id", id).maybeSingle();
  if (!table) return null;
  const [{ data: agents }, { data: runs }] = await Promise.all([
    admin.from("league_agents").select("id, name, domain").eq("league_table_id", id).order("name"),
    admin
      .from("scan_runs")
      .select("id, status, created_at, finished_at, cost_usd, engines, progress, error")
      .eq("league_table_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const latest = (runs ?? []).find((r) => r.status === "completed") ?? null;

  let rows: LeagueRow[] = [];
  let alsoNamed: { name: string; mentions: number }[] = [];
  let responseCount = 0;
  if (latest) {
    const { data: results } = await admin
      .from("scan_results")
      .select("id, engine, intent_group, created_at, prompt_text, parse_status")
      .eq("scan_run_id", latest.id);
    const ids = (results ?? []).map((r) => r.id);
    const mentions: AgentMentionRow[] = [];
    // Chunk the IN list to keep URLs short.
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await admin
        .from("agent_mentions")
        .select("scan_result_id, agent_name, normalised_name, position, is_branch, matched_competitor_id, matched_league_agent_id, match_confidence, sentiment_score, descriptors")
        .in("scan_result_id", ids.slice(i, i + 200));
      mentions.push(...((data ?? []) as AgentMentionRow[]));
    }
    const responses = toMetricResponses((results ?? []) as ScanResultRow[], mentions);
    responseCount = responses.filter((r) => r.parsed).length;
    const threshold = getScanSettings().lowSampleThreshold;
    rows = (agents ?? [])
      .map((a) => {
        const m = computeSubjectMetrics(responses, a.id, { lowSampleThreshold: threshold });
        return {
          agentId: a.id,
          name: a.name,
          domain: a.domain,
          responses: m.responses,
          mentions: m.mentions,
          mentionRate: m.visibility,
          shareOfVoice: m.shareOfVoice,
          position: m.position,
          lowSample: m.lowSample,
        };
      })
      .sort((a, b) => (b.mentionRate ?? -1) - (a.mentionRate ?? -1) || (b.shareOfVoice ?? -1) - (a.shareOfVoice ?? -1));

    // Agents AI named that aren't on the imported list: worth adding.
    const counts = new Map<string, { name: string; responses: Set<string> }>();
    for (const m of mentions as (AgentMentionRow & { agent_name?: string })[]) {
      if (m.matched_league_agent_id) continue;
      const e = counts.get(m.normalised_name) ?? { name: m.agent_name ?? m.normalised_name, responses: new Set() };
      e.responses.add(m.scan_result_id);
      counts.set(m.normalised_name, e);
    }
    alsoNamed = [...counts.values()]
      .map((e) => ({ name: e.name, mentions: e.responses.size }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 15);
  }
  return { table, agents: agents ?? [], runs: runs ?? [], latest, rows, alsoNamed, responseCount };
}
