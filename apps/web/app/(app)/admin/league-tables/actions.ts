"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ENGINE_IDS, getScanSettings, normaliseAgentName, normaliseDomain } from "@privett/core";
import type { ActionResult } from "@/components/platform/action-form";
import { requireAdmin } from "@/lib/auth";
import { splitList } from "@/lib/branches";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** Parses "name,domain" lines (a header row and quotes are tolerated). */
function parseAgents(text: string) {
  const out = new Map<string, { name: string; normalised_name: string; domain: string | null }>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [nameRaw, domainRaw] = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    if (!nameRaw || /^name$/i.test(nameRaw)) continue;
    const normalised = normaliseAgentName(nameRaw);
    if (!normalised || out.has(normalised)) continue;
    out.set(normalised, { name: nameRaw, normalised_name: normalised, domain: normaliseDomain(domainRaw) });
  }
  return [...out.values()];
}

export async function createLeagueTable(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdmin();
  const town = String(formData.get("town") ?? "").trim();
  if (!town) return { error: "Town is required." };
  let text = String(formData.get("agents") ?? "");
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 500_000) return { error: "CSV is too large." };
    text += `\n${await file.text()}`;
  }
  const agents = parseAgents(text);
  if (agents.length < 2) return { error: "Add at least two agents, one per line as name,domain." };

  const admin = getSupabaseAdminClient();
  const { data: table, error } = await admin
    .from("league_tables")
    .insert({ town, areas: splitList(formData.get("areas")), created_by: user.id })
    .select("id")
    .single();
  if (error || !table) return { error: "Couldn't create the league table." };
  const { error: aErr } = await admin
    .from("league_agents")
    .insert(agents.map((a) => ({ ...a, league_table_id: table.id })));
  if (aErr) return { error: "Couldn't save the agents." };
  redirect(`/admin/league-tables/${table.id}`);
}

export async function queueLeagueScan(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("league_table_id"));
  const admin = getSupabaseAdminClient();
  const { count } = await admin
    .from("scan_runs")
    .select("id", { count: "exact", head: true })
    .eq("league_table_id", id)
    .in("status", ["queued", "running"]);
  if (!count) {
    const s = getScanSettings();
    await admin.from("scan_runs").insert({
      league_table_id: id,
      kind: "league",
      engines: [...ENGINE_IDS],
      runs_per_prompt: s.leagueRunsPerPrompt,
      budget_usd: s.leagueBudgetUsd,
    });
    await admin.from("league_tables").update({ status: "queued" }).eq("id", id);
  }
  revalidatePath(`/admin/league-tables/${id}`);
}
