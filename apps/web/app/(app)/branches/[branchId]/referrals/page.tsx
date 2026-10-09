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
        <p className="max-w-2xl text-sm text-ink-muted">
          Visits to your website that arrive from AI assistants such as ChatGPT, Perplexity, Gemini, Copilot and Claude. We record the source, the page they
          landed on and the time. Nothing about the visitor, and no cookies.
        </p>
        <div className="flex gap-1.5">
          {DAY_PRESETS.map((d) => (
            <Link
              key={d}
              href={`${base}?days=${d}`}
              className={cn(
                "rounded-full border px-3 py-1 text-small font-medium",
                d === days ? "border-brand bg-brand text-on-brand" : "border-hairline bg-surface-raised text-ink-muted",
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
            <p className="text-small text-ink-muted">AI referral visits</p>
            <p className="font-mono text-metric text-ink">{events.length}</p>
            <p className="text-small text-ink-muted">Last {days} days</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-small text-ink-muted">Top source</p>
            <p className="text-title text-ink">{bySource[0] ? (labelOf.get(bySource[0].key) ?? bySource[0].key) : "—"}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-small text-ink-muted">Last visit recorded</p>
            <p className="font-mono text-heading font-medium text-ink">{last ? formatDateTime(last) : "—"}</p>
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
            <ul className="divide-y divide-hairline text-sm">
              {bySource.map((s) => (
                <li key={s.key} className="flex justify-between px-5 py-2">
                  <span>{labelOf.get(s.key) ?? s.key}</span>
                  <span className="font-mono">{s.count}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="By landing page" description="The pages AI sends people to." />
            <ul className="divide-y divide-hairline text-sm">
              {byPage.map((p) => (
                <li key={p.key} className="flex justify-between gap-3 px-5 py-2">
                  <span className="truncate font-mono text-small">{p.key}</span>
                  <span className="font-mono">{p.count}</span>
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
            <h4 className="text-sm text-ink">Any website</h4>
            <p className="text-sm text-ink-muted">Paste this just before the closing &lt;/head&gt; tag, or ask your web developer to.</p>
            <CodeBlock text={tag} label="HTML" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm text-ink">WordPress</h4>
            <p className="text-sm text-ink-muted">
              The simplest route is a header plugin such as WPCode: add a new header snippet, paste the line above and save. Or add this to your theme’s
              functions.php:
            </p>
            <CodeBlock text={wordpress} label="functions.php" />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm text-ink">Google Tag Manager</h4>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-muted">
              <li>In your container, add a new tag of type Custom HTML.</li>
              <li>Paste the line above into the HTML box.</li>
              <li>Set the trigger to All Pages, save, then Submit to publish.</li>
            </ol>
          </div>
          <p className="text-small text-ink-muted">
            To check it’s working, ask ChatGPT about your agency, click the link to your site, then refresh this page. Some assistants hide where visits come from, so
            treat these figures as a floor, not a total.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
