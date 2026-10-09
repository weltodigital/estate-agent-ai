"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { INTENT_GROUPS, renderPromptsForBranch, type IntentGroup } from "@privett/core";
import type { ActionResult } from "@/components/platform/action-form";
import { requireBranch } from "@/lib/auth";
import { loadPromptLibrary, normaliseWebsite, splitList } from "@/lib/branches";
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
  const { branch } = await requireBranch(String(formData.get("branch_id")));
  const name = String(formData.get("name") ?? "").trim();
  const town = String(formData.get("town") ?? "").trim();
  const websiteRaw = String(formData.get("website") ?? "").trim();
  if (!name || !town) return { error: "Branch name and town are required." };
  const { website, domain } = normaliseWebsite(websiteRaw);
  if (websiteRaw && !domain) return { error: "That website address doesn't look right." };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("branches")
    .update({
      name: name.slice(0, 120),
      town: town.slice(0, 80),
      website,
      domain,
      aliases: splitList(formData.get("aliases")).slice(0, 10),
      areas: splitList(formData.get("areas")).slice(0, 10),
      postcode: String(formData.get("postcode") ?? "").trim().toUpperCase() || null,
    })
    .eq("id", branch.id);
  if (error) return { error: "Couldn't save. Please try again." };
  revalidatePath(`/branches/${branch.id}`, "layout");
  return { ok: "Saved. Changes apply from the next scan." };
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
