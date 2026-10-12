import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { engineLabel, ENGINE_IDS, getPlans, type PlanConfig } from "@privett/core";
import { buttonClasses } from "@/components/ui/button";
import { priceLabel, purchasablePlans } from "@/lib/billing";
import { COPY } from "@/lib/copy";
import { faqSchema, jsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { AssistantChips } from "@/components/marketing/assistant-names";

export const metadata = {
  title: "Pricing",
  description: "Starter, Pro and Agency plans for tracking how AI assistants recommend your estate agency. Billed monthly, cancel any time.",
};

const FAQ = [
  {
    q: "How does billing work?",
    a: "Plans are billed monthly by card through Stripe, starting the day you subscribe. You can change your card and download invoices any time from Plan and billing.",
  },
  {
    q: "Is VAT included?",
    a: "Prices are in pounds. If VAT applies, it's added at checkout.",
  },
  {
    q: "How do branches work on Agency?",
    a: "Agency is priced per branch, from two branches. Each branch is tracked separately, with its own town, neighbourhoods, questions and fixes. You can add branches from the billing portal and your bill adjusts.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Cancel in the billing portal in a couple of clicks. There's no contract or notice period.",
  },
  {
    q: "What happens to my results if I cancel?",
    a: "Your weekly scans carry on until the end of the month you've paid for. After that, scans stop, but you can still sign in and see your past results.",
  },
  {
    q: "Can I try it before paying?",
    a: "Yes. The free scan asks five questions on two assistants and shows how often you're named, who's named instead and your first fix. No card needed.",
  },
];

type Cell = string | boolean;

function rows(plans: PlanConfig[]): { label: string; cells: Cell[] }[] {
  return [
    { label: "Price", cells: plans.map((p) => priceLabel(p.id)) },
    {
      label: "AI assistants",
      cells: plans.map((p) => (p.limits.engines.length === ENGINE_IDS.length ? "All four" : p.limits.engines.map(engineLabel).join(", "))),
    },
    { label: "Questions per branch", cells: plans.map((p) => `Up to ${p.limits.promptsPerBranch}`) },
    { label: "Neighbourhoods per branch", cells: plans.map((p) => `Up to ${p.limits.maxAreas}`) },
    { label: "Runs per question", cells: plans.map((p) => String(p.limits.runsPerPrompt)) },
    { label: "Scan frequency", cells: plans.map(() => "Weekly") },
    { label: "Extra scans", cells: plans.map((p) => (p.limits.manualScansPerMonth ? `${p.limits.manualScansPerMonth} a month` : false)) },
    {
      label: "Branches",
      cells: plans.map((p) => (p.limits.maxBranches === 1 ? "1" : `From ${p.limits.minBranches}`)),
    },
    { label: "Competitors and sources", cells: plans.map(() => true) },
    { label: "Fixes with ready-to-paste drafts", cells: plans.map(() => true) },
    { label: "Website visit tracking", cells: plans.map(() => true) },
    { label: "Invite colleagues", cells: plans.map(() => true) },
  ];
}

function Value({ v }: { v: Cell }) {
  if (v === true) return <Check size={16} strokeWidth={1.5} className="mx-auto text-ink" aria-label="Included" />;
  if (v === false) return <Minus size={16} strokeWidth={1.5} className="mx-auto text-ink-muted" aria-label="Not included" />;
  // Numbers in Geist Mono; words stay in the reading face.
  return <span className={/\d/.test(v) ? "font-mono text-data text-ink" : "text-sm text-ink"}>{v}</span>;
}

export default function PricingPage() {
  const plans = purchasablePlans();
  const free = getPlans().free.limits;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(FAQ)) }} />
      <p className="text-label uppercase text-ink-muted">Pricing</p>
      <h1 className="mt-2 text-display text-ink">Simple monthly plans</h1>
      <p className="mt-4 max-w-2xl text-[17px] leading-[26px] text-ink-muted">
        Every plan scans weekly and shows every answer behind every number. Start with a free scan, then choose how much you want to track.
      </p>

      {/* Plan cards */}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const popular = p.id === "pro";
          return (
            <div
              key={p.id}
              className={cn("relative flex flex-col rounded-lg border bg-surface-raised p-6", popular ? "border-brand" : "border-hairline")}
            >
              {popular ? (
                <span className="absolute -top-3 left-6 rounded-full bg-signal px-2.5 py-0.5 text-label uppercase text-on-signal">Most popular</span>
              ) : null}
              <h2 className="text-heading text-ink">{p.name}</h2>
              <p className="mt-2 text-title text-ink">{priceLabel(p.id)}</p>
              <p className="mt-2 text-sm text-ink-muted">{p.description}</p>
              <AssistantChips engines={p.limits.engines} className="mt-4" />
              <ul className="mt-4 space-y-1.5 text-sm text-ink">
                <li>Up to {p.limits.promptsPerBranch} questions per branch</li>
                <li>{p.limits.runsPerPrompt} runs per question, every week</li>
                {p.limits.manualScansPerMonth ? <li>{p.limits.manualScansPerMonth} extra scan a month</li> : null}
                {p.id === "agency" ? <li>From {p.limits.minBranches} branches</li> : null}
              </ul>
              <div className="mt-auto pt-6">
                <Link href="/login?next=/onboarding" className={buttonClasses(popular ? "primary" : "secondary", "md", "w-full")}>
                  Choose {p.name}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison */}
      <section className="mt-16">
        <h2 className="text-title text-ink">Compare plans</h2>
        <div className="mt-6 overflow-x-auto rounded-lg border border-hairline bg-surface-raised">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left">Feature</th>
                {plans.map((p) => (
                  <th key={p.id} className="px-4 py-3 text-center">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows(plans).map((r) => (
                <tr key={r.label} className="border-t border-hairline">
                  <td className="px-4 py-3 text-ink">{r.label}</td>
                  {r.cells.map((c, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      <Value v={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Included */}
      <section className="mt-16 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-title text-ink">Every paid plan includes</h2>
          <ul className="mt-4 space-y-2 text-ink">
            {[
              "Weekly scans, with each question asked three times",
              "Who AI names instead of you, and how often",
              "Every answer, readable in full, behind every number",
              "The websites AI reads, and where you're missing",
              "Prioritised fixes with drafts to copy",
              "Visits to your website from AI assistants",
              "Your whole team, at no extra cost",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check size={16} strokeWidth={1.5} className="mt-1 shrink-0 text-ink" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-hairline bg-surface-raised p-6">
          <h2 className="text-heading text-ink">Not sure yet?</h2>
          <p className="mt-2 text-ink-muted">
            Run a free scan: {free.promptsPerBranch} questions on {free.engines.map(engineLabel).join(" and ")}, about 3 minutes, no card
            needed.
          </p>
          <Link href="/free-scan" className={buttonClasses("secondary", "md", "mt-4")}>
            Run free scan
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-16">
        <h2 className="text-title text-ink">Billing questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-lg border border-hairline bg-surface-raised">
              <summary className="cursor-pointer list-none px-5 py-4 font-medium text-ink">{f.q}</summary>
              <p className="px-5 pb-4 text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-12 text-small text-ink-muted">{COPY.noPromise}</p>
    </div>
  );
}
