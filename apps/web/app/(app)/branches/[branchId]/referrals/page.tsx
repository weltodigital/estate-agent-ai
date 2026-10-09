import Link from "next/link";
import { getReferrerSources } from "@privett/core";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CodeBlock } from "@/components/dashboard/copy-button";
import { ReferralChart } from "@/components/dashboard/referral-chart";
import { requireBranch } from "@/lib/auth";
import { countBy, referralsByWeek } from "@/lib/data/aggregate";
import { loadLastReferral, loadReferrals } from "@/lib/data/branch-data";
import { DAY_PRESETS, type SearchParams } from "@/lib/data/filters";
import { snippetTag } from "@/lib/data/snippet";
import { appUrl, cn, formatDateTime } from "@/lib/utils";

export const metadata = { title: "AI referrals" };

export default async function ReferralsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { branchId } = await params;
  const sp = await searchParams;
  const { branch } = await requireBranch(branchId);
  const daysRaw = Number(Array.isArray(sp.days) ? sp.days[0] : sp.days);
  const days = (DAY_PRESETS as readonly number[]).includes(daysRaw) ? daysRaw : 90;
  const from = new Date(Date.now() - days * 86_400_000).toISOString();

  const [events, last] = await Promise.all([loadReferrals(branch.id, from), loadLastReferral(branch.id)]);
  const sources = getReferrerSources();
  const labelOf = new Map(sources.map((s) => [s.id, s.label]));
  const bySource = countBy(events, (e) => e.source);
  const byPage = countBy(events, (e) => e.landing_path).slice(0, 15);
  const weekly = referralsByWeek(events);
  const seenSources = bySource.map((s) => ({ id: s.key, label: labelOf.get(s.key) ?? s.key }));

  const tag = snippetTag(appUrl(), branch.tracking_key);
  const base = `/branches/${branch.id}/referrals`;

  const wordpress = `<?php
// Add to your theme's functions.php (or a code snippets plugin).
add_action('wp_head', function () {
  echo '${tag}';
});`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-brand-walnut">
          Visits to your website that arrive from AI assistants such as ChatGPT, Perplexity, Gemini, Copilot and Claude. We record the source, the page they
          landed on and the time. Nothing about the visitor, and no cookies.
        </p>
        <div className="flex gap-1.5">
          {DAY_PRESETS.map((d) => (
            <Link
              key={d}
              href={`${base}?days=${d}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                d === days ? "border-brand-hedge bg-brand-hedge text-brand-bone" : "border-brand-stone bg-white text-brand-walnut",
              )}
            >
              Last {d} days
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="text-xs text-brand-slate">AI referral visits</p>
            <p className="text-3xl font-medium tabular-nums text-brand-ink">{events.length}</p>
            <p className="text-xs text-brand-slate">Last {days} days</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-brand-slate">Top source</p>
            <p className="text-3xl font-medium text-brand-ink">{bySource[0] ? (labelOf.get(bySource[0].key) ?? bySource[0].key) : "—"}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-brand-slate">Last visit recorded</p>
            <p className="text-lg font-medium text-brand-ink">{last ? formatDateTime(last) : "—"}</p>
            {last ? <Badge tone="good">Snippet is working</Badge> : <Badge tone="warn">Nothing received yet</Badge>}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Visits from AI assistants, by week" />
        <CardBody>
          {events.length ? (
            <ReferralChart data={weekly} sources={seenSources} />
          ) : (
            <EmptyState title="No AI referral visits in this period">
              {last ? "Visits will appear here as they arrive." : "Install the snippet below, then visits from AI assistants will appear here."}
            </EmptyState>
          )}
        </CardBody>
      </Card>

      {events.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="By source" />
            <ul className="divide-y divide-brand-stone text-sm">
              {bySource.map((s) => (
                <li key={s.key} className="flex justify-between px-5 py-2">
                  <span>{labelOf.get(s.key) ?? s.key}</span>
                  <span className="tabular-nums">{s.count}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="By landing page" description="The pages AI sends people to." />
            <ul className="divide-y divide-brand-stone text-sm">
              {byPage.map((p) => (
                <li key={p.key} className="flex justify-between gap-3 px-5 py-2">
                  <span className="truncate font-mono text-xs">{p.key}</span>
                  <span className="tabular-nums">{p.count}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      <Card id="install">
        <CardHeader title="Install the tracking snippet" description="One line, added once to every page of your website. It doesn’t slow your site down or set cookies." />
        <CardBody className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm text-brand-ink">Any website</h4>
            <p className="text-sm text-brand-walnut">Paste this just before the closing &lt;/head&gt; tag, or ask your web developer to.</p>
            <CodeBlock text={tag} label="HTML" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm text-brand-ink">WordPress</h4>
            <p className="text-sm text-brand-walnut">
              The simplest route is a header plugin such as WPCode: add a new header snippet, paste the line above and save. Or add this to your theme’s
              functions.php:
            </p>
            <CodeBlock text={wordpress} label="functions.php" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm text-brand-ink">Google Tag Manager</h4>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-brand-walnut">
              <li>In your container, add a new tag of type Custom HTML.</li>
              <li>Paste the line above into the HTML box.</li>
              <li>Set the trigger to All Pages, save, then Submit to publish.</li>
            </ol>
          </div>
          <p className="text-xs text-brand-slate">
            To check it’s working, ask ChatGPT about your agency, click the link to your site, then refresh this page. Some assistants hide where visits come from, so
            treat these figures as a floor, not a total.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
