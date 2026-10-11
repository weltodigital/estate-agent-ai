import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { runStrips, type RunOutcome } from "@/lib/data/answers";

// Loaders for answer cards. The user's client, so RLS scopes every read.

export interface AnswerDetail {
  id: string;
  answerText: string | null;
  /** Cited URLs in engine order (raw_json.citedUrls), so [1] maps to the first. */
  citedUrls: string[];
  scanRunId: string;
  runIndex: number;
  error: string | null;
}

/** Answer text, cited URLs and run position for up to a page of answers. */
export async function loadAnswerDetails(ids: string[]): Promise<Map<string, AnswerDetail>> {
  const out = new Map<string, AnswerDetail>();
  if (!ids.length) return out;
  const supabase = await getSupabaseServerClient();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase
      .from("scan_results")
      .select("id, answer_text, scan_run_id, run_index, error, cited:raw_json->citedUrls")
      .in("id", ids.slice(i, i + 100));
    for (const r of data ?? []) {
      const cited = (r as { cited?: unknown }).cited;
      out.set(r.id as string, {
        id: r.id as string,
        answerText: (r.answer_text as string | null) ?? null,
        citedUrls: Array.isArray(cited) ? cited.filter((u): u is string => typeof u === "string") : [],
        scanRunId: r.scan_run_id as string,
        runIndex: r.run_index as number,
        error: (r.error as string | null) ?? null,
      });
    }
  }
  return out;
}

/** Run strips ("named in X of N runs") for every question and engine in these scans. */
export async function loadRunStrips(runIds: string[]): Promise<Map<string, RunOutcome[]>> {
  const unique = [...new Set(runIds)];
  if (!unique.length) return new Map();
  const supabase = await getSupabaseServerClient();
  const rows: { scan_run_id: string; prompt_text: string; engine: string; run_index: number; parse_status: string; mentioned: boolean | null }[] = [];
  for (const runId of unique) {
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from("scan_results")
        .select("scan_run_id, prompt_text, engine, run_index, parse_status, mentioned")
        .eq("scan_run_id", runId)
        .order("id")
        .range(from, from + 999);
      rows.push(...((data ?? []) as typeof rows));
      if (!data || data.length < 1000) break;
    }
  }
  return runStrips(rows);
}

/** Cited URLs from the citations table, for answers whose raw data has none. */
export async function loadCitationUrls(ids: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!ids.length) return out;
  const supabase = await getSupabaseServerClient();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase.from("citations").select("scan_result_id, url").in("scan_result_id", ids.slice(i, i + 100));
    for (const c of data ?? []) {
      const list = out.get(c.scan_result_id as string) ?? [];
      list.push(c.url as string);
      out.set(c.scan_result_id as string, list);
    }
  }
  return out;
}
