import Link from "next/link";
import { engineLabel, INTENT_GROUPS, INTENT_LABELS, renderPromptsForBranch, trackedAreas, trackedPrompts } from "@privett/core";
import { ActionForm } from "@/components/platform/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { requireBranch } from "@/lib/auth";
import { loadPromptLibrary } from "@/lib/branches";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import {
  addCustomPrompt,
  addLibraryPrompt,
  archiveBranch,
  scanNow,
  updateBranch,
  updatePromptText,
} from "./actions";
import { PromptToggle } from "./prompt-toggle";

export const metadata = { title: "Branch settings" };

const STATUS_TONE = { completed: "good", failed: "bad", budget_exceeded: "warn", running: "brand", queued: "neutral" } as const;

export default async function BranchSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { branchId } = await params;
  const { error } = await searchParams;
  const ctx = await requireBranch(branchId);
  const { branch, plan } = ctx;
  const supabase = await getSupabaseServerClient();

  const [{ data: prompts }, { data: runs }, library] = await Promise.all([
    supabase.from("branch_prompts").select("id, text, intent_group, area, active, prompt_id").eq("branch_id", branch.id).order("created_at"),
    supabase
      .from("scan_runs")
      .select("id, kind, status, engines, created_at, finished_at, error")
      .eq("branch_id", branch.id)
      .order("created_at", { ascending: false })
      .limit(5),
    loadPromptLibrary(getSupabaseAdminClient()),
  ]);

  const active = (prompts ?? []).filter((p) => p.active).length;
  // What the next scan asks, by the same rule the worker uses.
  const tracked = trackedPrompts(prompts ?? [], branch.areas, plan.limits);
  const notAsked = new Map<string, string>([
    ...tracked.overArea.map((p) => [p.id, "Not asked: neighbourhood over your plan"] as const),
    ...tracked.overCount.map((p) => [p.id, "Not asked: over your plan's limit"] as const),
  ]);
  const droppedAreas = trackedAreas(branch.areas, plan.limits).dropped;
  const existing = new Set((prompts ?? []).map((p) => p.text.toLowerCase()));
  const libraryOptions = renderPromptsForBranch(library, branch, 500).filter((p) => !existing.has(p.text.toLowerCase()));
  const hidden = <input type="hidden" name="branch_id" value={branch.id} />;

  return (
    <div className="space-y-8">
      {error === "prompt-limit" ? (
        <p role="alert" className="rounded-md bg-warn/10 p-3 text-sm text-warn">
          Your plan tracks up to {plan.limits.promptsPerBranch} questions per branch. Turn one off first.
        </p>
      ) : null}
      {error === "owner" ? (
        <p role="alert" className="rounded-md bg-warn/10 p-3 text-sm text-warn">Only an owner can do that.</p>
      ) : null}

      <Card>
        <CardHeader title="Scans" description={`Weekly across ${plan.limits.engines.map(engineLabel).join(", ")}, ${plan.limits.runsPerPrompt} runs per question.`} />
        <CardBody className="space-y-4">
          <ActionForm action={scanNow}>
            {hidden}
            <Button type="submit" variant="secondary">Scan now</Button>
            <p className="mt-1 text-small text-ink-muted">
              {plan.limits.manualScansPerMonth
                ? `${plan.limits.manualScansPerMonth} extra scan a month per branch, on top of the weekly scan.`
                : "Extra scans come with Pro and Agency. Your weekly scan runs as normal."}
            </p>
          </ActionForm>
          {runs?.length ? (
            <table className="w-full text-left text-sm">
              <thead className="text-small text-ink-muted">
                <tr>
                  <th className="py-1 font-medium">Started</th>
                  <th className="font-medium">Type</th>
                  <th className="font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-hairline">
                    <td className="py-1.5">{formatDateTime(r.created_at)}</td>
                    <td className="capitalize">{r.kind}</td>
                    <td>
                      <Badge tone={STATUS_TONE[r.status as keyof typeof STATUS_TONE] ?? "neutral"}>{r.status === "budget_exceeded" ? "partly complete" : r.status.replace("_", " ")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </CardBody>
      </Card>

      <Card id="details" className="scroll-mt-24">
        <CardHeader title="Branch details" description="How we recognise you in AI answers." />
        <CardBody>
          <ActionForm action={updateBranch} className="space-y-4">
            {hidden}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Branch name">
                <Input name="name" defaultValue={branch.name} required />
              </Field>
              <Field label="Website">
                <Input name="website" defaultValue={branch.website ?? ""} />
              </Field>
              <Field label="Town">
                <Input name="town" defaultValue={branch.town} required />
              </Field>
              <Field label="Postcode">
                <Input name="postcode" defaultValue={branch.postcode ?? ""} />
              </Field>
            </div>
            <Field label="Other names AI might use" hint="Comma separated. Exact matches count as mentions; near matches are flagged for review.">
              <Input name="aliases" defaultValue={branch.aliases.join(", ")} />
            </Field>
            <Field
              label="Neighbourhoods you cover"
              hint={
                droppedAreas.length
                  ? `Your plan covers the first ${plan.limits.maxAreas}, so ${droppedAreas.join(", ")} ${droppedAreas.length === 1 ? "isn't" : "aren't"} tracked. Remove or reorder to choose which.`
                  : `Up to ${plan.limits.maxAreas}, comma separated. Add questions about new areas below.`
              }
            >
              <Input name="areas" defaultValue={branch.areas.join(", ")} />
            </Field>
            <Button type="submit">Save details</Button>
          </ActionForm>
        </CardBody>
      </Card>

      <Card id="questions" className="scroll-mt-24">
        <CardHeader
          title="Tracked questions"
          description={
            notAsked.size
              ? `${tracked.asked.length} of ${active} turned-on questions are asked; your plan covers ${plan.limits.promptsPerBranch}. Turn off the ones you don't need to choose which.`
              : `${active} of ${plan.limits.promptsPerBranch} active. Each one is asked on every engine, ${plan.limits.runsPerPrompt} times per scan.`
          }
        />
        <CardBody className="space-y-2">
          {(prompts ?? []).map((p) => (
            <div key={p.id} className="flex flex-wrap items-start gap-3 border-b border-hairline pb-2 last:border-0">
              <ActionForm action={updatePromptText} className="flex min-w-0 flex-1 gap-2">
                {hidden}
                <input type="hidden" name="prompt_id" value={p.id} />
                <Input name="text" defaultValue={p.text} className={p.active ? "" : "text-ink-muted"} aria-label="Question" />
                <Button type="submit" variant="ghost" size="sm" className="h-10">Save</Button>
              </ActionForm>
              <Badge>{INTENT_LABELS[p.intent_group as keyof typeof INTENT_LABELS] ?? p.intent_group}</Badge>
              {notAsked.has(p.id) ? <Badge tone="warn">{notAsked.get(p.id)}</Badge> : null}
              <PromptToggle branchId={branch.id} promptId={p.id} active={p.active} text={p.text} />
            </div>
          ))}
        </CardBody>
        <CardBody className="grid gap-6 border-t border-hairline md:grid-cols-2">
          <ActionForm action={addLibraryPrompt} className="space-y-2">
            {hidden}
            <Field label="Add from the Privett library">
              <Select name="library_key" defaultValue="">
                <option value="" disabled>
                  Choose a question
                </option>
                {libraryOptions.map((o) => (
                  <option key={`${o.prompt_id}|${o.area ?? ""}`} value={`${o.prompt_id}|${o.area ?? ""}`}>
                    {o.text}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" variant="secondary" size="sm">Add question</Button>
          </ActionForm>
          <ActionForm action={addCustomPrompt} className="space-y-2">
            {hidden}
            <Field label="Or write your own">
              <Input name="text" placeholder={`best estate agent for flats in ${branch.town}`} />
            </Field>
            <Select name="intent_group" defaultValue="selling" aria-label="Type of question">
              {INTENT_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {INTENT_LABELS[g]}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" size="sm">Add question</Button>
          </ActionForm>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Website tracking" description="See visits that AI assistants send to your site." />
        <CardBody>
          <Link href={`/branches/${branch.id}/referrals`} className="text-sm text-brand underline-offset-2 hover:underline">
            Get your tracking snippet
          </Link>
        </CardBody>
      </Card>

      {ctx.role === "owner" ? (
        <Card>
          <CardHeader title="Archive branch" description="Stops scans and frees the branch on your plan. Past results are kept." />
          <CardBody>
            <form action={archiveBranch}>
              {hidden}
              <Button type="submit" variant="danger">Archive {branch.name}</Button>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
