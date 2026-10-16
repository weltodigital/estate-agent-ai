"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { INTENT_GROUPS, renderPromptsForBranch, renderPromptText, type IntentGroup } from "@privett/core";
import type { ActionResult } from "@/components/platform/action-form";
import { requireBranch } from "@/lib/auth";
import { loadPromptLibrary, normaliseWebsite, splitList } from "@/lib/branches";
import { lookupCounty } from "@/lib/county";
import { enqueueScan } from "@/lib/scans";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const path = (id: string) => `/branches/${id}/settings`;

async function activePromptCount(branchId: string) {
  const { count } = await getSupabaseAdminClient()
    .from("branch_prompts")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", branchId)
    .eq("active", true);
  return count ?? 0;
}

export async function updateBranch(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { branch, plan } = await requireBranch(String(formData.get("branch_id")));
  const name = String(formData.get("name") ?? "").trim();
  const town = String(formData.get("town") ?? "").trim();
  const websiteRaw = String(formData.get("website") ?? "").trim();
  if (!name || !town) return { error: "Branch name and town are required." };
  const { website, domain } = normaliseWebsite(websiteRaw);
  if (websiteRaw && !domain) return { error: "That website address doesn't look right." };
  const areas = splitList(formData.get("areas"));
  if (areas.length > plan.limits.maxAreas) {
    return { error: `Your plan covers up to ${plan.limits.maxAreas} neighbourhoods per branch. Remove ${areas.length - plan.limits.maxAreas} to save.` };
  }

  const postcode = String(formData.get("postcode") ?? "").trim().toUpperCase() || null;
  const countyInput = String(formData.get("county") ?? "").trim().slice(0, 60);
  const placeChanged = postcode !== branch.postcode || town.toLowerCase() !== branch.town.toLowerCase();
  // A new town or postcode gets a fresh lookup, unless the county was edited too.
  const county = placeChanged && countyInput === (branch.county ?? "") ? await lookupCounty(postcode, town) : countyInput || null;

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("branches")
    .update({
      name: name.slice(0, 120),
      town: town.slice(0, 80),
      website,
      domain,
      aliases: splitList(formData.get("aliases")).slice(0, 10),
      areas,
      postcode,
      county,
    })
    .eq("id", branch.id);
  if (error) return { error: "Couldn't save. Please try again." };
  if (town !== branch.town || county !== branch.county) {
    await rerenderLibraryPrompts(branch.id, branch, { town: town.slice(0, 80), county });
  }
  revalidatePath(`/branches/${branch.id}`, "layout");
  return { ok: county ? `Saved. Questions about your town now say “${town}, ${county}”.` : "Saved. Changes apply from the next scan." };
}

/**
 * After the town or county changes, rewrite library questions to match,
 * unless the user has edited their wording.
 */
async function rerenderLibraryPrompts(
  branchId: string,
  before: { town: string; county: string | null },
  after: { town: string; county: string | null },
) {
  const supabase = await getSupabaseServerClient();
  const [library, { data: rows }] = await Promise.all([
    loadPromptLibrary(getSupabaseAdminClient()),
    supabase.from("branch_prompts").select("id, prompt_id, area, text").eq("branch_id", branchId).not("prompt_id", "is", null),
  ]);
  const templates = new Map(library.map((t) => [t.id, t.template]));
  for (const r of rows ?? []) {
    const template = templates.get(r.prompt_id as string);
    if (!template || r.text !== renderPromptText(template, r.area, before)) continue;
    const text = renderPromptText(template, r.area, after);
    if (text !== r.text) await supabase.from("branch_prompts").update({ text }).eq("id", r.id).eq("branch_id", branchId);
  }
}

export async function updatePromptText(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { branch } = await requireBranch(String(formData.get("branch_id")));
  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 8) return { error: "Questions need to be a little longer." };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("branch_prompts")
    .update({ text: text.slice(0, 300) })
    .eq("id", String(formData.get("prompt_id")))
    .eq("branch_id", branch.id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath(path(branch.id));
  return { ok: "Saved." };
}

/** Optimistic version for the prompt switch: returns an error instead of redirecting. */
export async function setPromptActive(branchId: string, promptId: string, activate: boolean): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireBranch(branchId);
  if (activate && (await activePromptCount(ctx.branch.id)) >= ctx.plan.limits.promptsPerBranch) {
    return { error: `Your plan tracks up to ${ctx.plan.limits.promptsPerBranch} questions per branch. Turn one off first.` };
  }
  const supabase = await getSupabaseServerClient();
  const { error, count } = await supabase
    .from("branch_prompts")
    .update({ active: activate }, { count: "exact" })
    .eq("id", promptId)
    .eq("branch_id", ctx.branch.id);
  if (error || !count) return { error: "We couldn’t save that change. Please try again." };
  revalidatePath(path(ctx.branch.id));
  return { ok: true };
}

export async function togglePrompt(formData: FormData) {
  const ctx = await requireBranch(String(formData.get("branch_id")));
  const activate = formData.get("active") === "true";
  if (activate && (await activePromptCount(ctx.branch.id)) >= ctx.plan.limits.promptsPerBranch) {
    redirect(`${path(ctx.branch.id)}?error=prompt-limit`);
  }
  const supabase = await getSupabaseServerClient();
  await supabase
    .from("branch_prompts")
    .update({ active: activate })
    .eq("id", String(formData.get("prompt_id")))
    .eq("branch_id", ctx.branch.id);
  revalidatePath(path(ctx.branch.id));
}

export async function addCustomPrompt(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireBranch(String(formData.get("branch_id")));
  const text = String(formData.get("text") ?? "").trim();
  const intent = String(formData.get("intent_group") ?? "") as IntentGroup;
  if (text.length < 8) return { error: "Write the question as someone would ask an AI assistant." };
  if (!INTENT_GROUPS.includes(intent)) return { error: "Pick a type of question." };
  if ((await activePromptCount(ctx.branch.id)) >= ctx.plan.limits.promptsPerBranch) {
    return { error: `Your plan tracks up to ${ctx.plan.limits.promptsPerBranch} questions per branch. Turn one off first.` };
  }
  const { error } = await getSupabaseAdminClient().from("branch_prompts").insert({
    org_id: ctx.org.id,
    branch_id: ctx.branch.id,
    text: text.slice(0, 300),
    intent_group: intent,
  });
  if (error) return { error: "Couldn't add the question. Please try again." };
  revalidatePath(path(ctx.branch.id));
  return { ok: "Added. It's included from the next scan." };
}

export async function addLibraryPrompt(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireBranch(String(formData.get("branch_id")));
  const key = String(formData.get("library_key") ?? "");
  if ((await activePromptCount(ctx.branch.id)) >= ctx.plan.limits.promptsPerBranch) {
    return { error: `Your plan tracks up to ${ctx.plan.limits.promptsPerBranch} questions per branch. Turn one off first.` };
  }
  const admin = getSupabaseAdminClient();
  const rendered = renderPromptsForBranch(await loadPromptLibrary(admin), ctx.branch, 500);
  const pick = rendered.find((p) => `${p.prompt_id}|${p.area ?? ""}` === key);
  if (!pick) return { error: "Pick a question from the list." };
  const { error } = await admin.from("branch_prompts").insert({
    org_id: ctx.org.id,
    branch_id: ctx.branch.id,
    prompt_id: pick.prompt_id,
    text: pick.text,
    intent_group: pick.intent_group,
    area: pick.area,
  });
  if (error) return { error: "Couldn't add the question. Please try again." };
  revalidatePath(path(ctx.branch.id));
  return { ok: "Added. It's included from the next scan." };
}

export async function scanNow(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireBranch(String(formData.get("branch_id")));
  const res = await enqueueScan({ orgId: ctx.org.id, branchId: ctx.branch.id, kind: "manual" });
  if (!res.ok) return { error: res.error };
  revalidatePath(path(ctx.branch.id));
  return { ok: "Scan queued. Results usually arrive within a few minutes." };
}

export async function archiveBranch(formData: FormData) {
  const ctx = await requireBranch(String(formData.get("branch_id")));
  if (ctx.role !== "owner") redirect(`${path(ctx.branch.id)}?error=owner`);
  // Archived branches keep their data; they stop being scanned and counted.
  await getSupabaseAdminClient()
    .from("branches")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", ctx.branch.id)
    .eq("org_id", ctx.org.id);
  redirect("/dashboard");
}
