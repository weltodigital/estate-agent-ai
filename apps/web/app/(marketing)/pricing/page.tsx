import Link from "next/link";
import { engineLabel } from "@privett/core";
import { buttonClasses } from "@/components/ui/button";
import { priceLabel, purchasablePlans } from "@/lib/billing";
import { COPY } from "@/lib/copy";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 md:px-8">
      <h1 className="text-5xl text-brand-ink">Pricing</h1>
      <p className="mt-3 max-w-2xl text-brand-walnut">Priced per branch, billed monthly. Cancel any time.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-brand-stone bg-white p-6 shadow-card">
          <h3 className="text-2xl">Free scan</h3>
          <p className="mt-2 font-serif text-3xl">Free</p>
          <p className="mt-3 text-sm text-brand-walnut">A one-off snapshot: five questions, two assistants, your visibility score, who's named instead and your first fix.</p>
          <Link href="/free-scan" className={buttonClasses("secondary", "md", "mt-6 w-full")}>Run a free scan</Link>
        </div>
        {purchasablePlans().map((p) => (
          <div key={p.id} className="rounded-lg border border-brand-stone bg-white p-6 shadow-card">
            <h3 className="text-2xl">{p.name}</h3>
            <p className="mt-2 font-serif text-3xl">{priceLabel(p.id)}</p>
            <p className="mt-3 text-sm text-brand-walnut">{p.description}</p>
            <ul className="mt-4 space-y-1 text-sm text-brand-walnut">
              <li>Up to {p.limits.promptsPerBranch} questions per branch</li>
              <li>{p.limits.engines.map(engineLabel).join(", ")}</li>
              <li>{p.limits.runsPerPrompt} runs per question, every week</li>
              <li>Competitors, citations and every raw answer</li>
              <li>Fixes with ready-to-paste drafts</li>
              <li>AI referral tracking for your website</li>
              {p.id === "multi" ? <li>Up to {p.limits.maxBranches} branches, several users</li> : null}
            </ul>
            <Link href="/login?next=/onboarding" className={buttonClasses("primary", "md", "mt-6 w-full")}>Get started</Link>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm text-brand-slate">{COPY.noPromise}</p>
    </section>
  );
}
