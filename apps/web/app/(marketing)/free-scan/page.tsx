import Link from "next/link";
import { FreeScanStepOne, FreeScanStepTwo } from "@/components/marketing/free-scan-form";
import { buttonClasses } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

export const metadata = {
  title: "Free AI visibility scan",
  description: "See how often ChatGPT and Perplexity name your estate agency when people ask for an agent in your town. Free, about 3 minutes, no card needed.",
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export default async function FreeScanPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const website = one(sp.website).slice(0, 300);
  const town = one(sp.town).slice(0, 80);
  const step = website && town && !one(sp.edit) ? 2 : 1;
  const user = await getUser().catch(() => null);
  const resultsByEmail = process.env.NEXT_PUBLIC_RESULTS_BY_EMAIL === "true";

  return (
    <section className="mx-auto grid max-w-5xl gap-12 px-4 py-16 md:grid-cols-2 md:px-8">
      <div>
        <p className="text-label uppercase text-ink-muted">Free scan</p>
        <h1 className="mt-2 text-display text-ink">See what AI says about agents in your town</h1>
        <p className="mt-4 text-[17px] leading-[26px] text-ink-muted">
          We ask ChatGPT and Perplexity five questions sellers and landlords ask about agents in your town, and show you:
        </p>
        <ul className="mt-4 space-y-2 text-ink">
          <li>How often you&apos;re named</li>
          <li>The agents named instead</li>
          <li>Your first fix, with the evidence behind it</li>
        </ul>
        <p className="mt-6 text-small text-ink-muted">
          Free · About 3 minutes · No card needed{resultsByEmail ? " · Results by email" : ""}. It&apos;s a small sample, so treat it as a
          first look. Paid plans ask up to 18 questions per branch on up to four assistants, three times each, every week.
        </p>
      </div>
      <div className="rounded-lg border border-hairline bg-surface-raised p-6">
        {user ? (
          <div>
            <h2 className="text-heading text-ink">You already have an account</h2>
            <p className="mt-2 text-ink-muted">
              Free scans are for agencies new to Privett. Add a branch to track it every week, with every answer and fix.
            </p>
            <Link href="/dashboard" className={buttonClasses("primary", "md", "mt-6")}>
              Go to your dashboard
            </Link>
          </div>
        ) : step === 1 ? (
          <>
            <p className="mb-4 text-label uppercase text-ink-muted">Step 1 of 2</p>
            <FreeScanStepOne website={website} town={town} />
          </>
        ) : (
          <>
            <p className="mb-4 text-label uppercase text-ink-muted">Step 2 of 2</p>
            <FreeScanStepTwo website={website} town={town} resultsByEmail={resultsByEmail} />
          </>
        )}
      </div>
    </section>
  );
}
