import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliseDomain, renderPromptsForBranch, type PromptTemplate } from "@privett/core";

export function splitList(input: FormDataEntryValue | null | undefined): string[] {
  return String(input ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v, i, a) => a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);
}

export function normaliseWebsite(input: string | null | undefined): { website: string | null; domain: string | null } {
  const raw = (input ?? "").trim();
  if (!raw) return { website: null, domain: null };
  const domain = normaliseDomain(raw);
  if (!domain) return { website: null, domain: null };
  const website = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return { website, domain };
}

export async function loadPromptLibrary(admin: SupabaseClient): Promise<PromptTemplate[]> {
  const { data, error } = await admin
    .from("prompts")
    .select("id, template, intent_group, uses_area, sort_order")
    .is("org_id", null)
    .eq("active", true);
  if (error) throw error;
  return (data ?? []) as PromptTemplate[];
}

/**
 * Inserts a branch and its rendered prompts. Service role: callers must have
 * checked plan limits first.
 */
export async function createBranchWithPrompts(
  admin: SupabaseClient,
  input: {
    orgId: string;
    name: string;
    aliases: string[];
    website: string | null;
    town: string;
    areas: string[];
    postcode: string | null;
    promptLimit: number;
    /** Render only town-level prompts (free scan). */
    townOnly?: boolean;
  },
): Promise<{ branchId: string }> {
  const { website, domain } = normaliseWebsite(input.website);
  const { data: branch, error } = await admin
    .from("branches")
    .insert({
      org_id: input.orgId,
      name: input.name,
      aliases: input.aliases,
      website,
      domain,
      town: input.town,
      areas: input.areas,
      postcode: input.postcode,
    })
    .select("id")
    .single();
  if (error || !branch) throw error ?? new Error("branch insert failed");

  const library = await loadPromptLibrary(admin);
  const rendered = renderPromptsForBranch(
    input.townOnly ? library.filter((t) => !t.uses_area) : library,
    { town: input.town, areas: input.townOnly ? [] : input.areas },
    input.promptLimit,
  );
  if (rendered.length) {
    const { error: pErr } = await admin.from("branch_prompts").insert(
      rendered.map((p) => ({
        org_id: input.orgId,
        branch_id: branch.id,
        prompt_id: p.prompt_id,
        text: p.text,
        intent_group: p.intent_group,
        area: p.area,
      })),
    );
    if (pErr) throw pErr;
  }
  return { branchId: branch.id as string };
}
