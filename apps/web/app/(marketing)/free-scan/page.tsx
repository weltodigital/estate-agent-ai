import Link from "next/link";
import { FreeScanForm } from "@/components/marketing/free-scan-form";
import { buttonClasses } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

export const metadata = { title: "Free AI visibility scan" };

export default async function FreeScanPage() {
  const user = await getUser().catch(() => null);
  return (
    <section className="mx-auto grid max-w-5xl gap-12 px-4 py-16 md:grid-cols-2 md:px-8">
      <div>
        <h1 className="text-display text-ink">Free AI visibility scan</h1>
        <p className="mt-4 text-ink-muted">
          We'll ask ChatGPT and Perplexity five questions sellers and landlords ask about agents in your town, and show you:
        </p>
        <ul className="mt-4 space-y-2 text-ink-muted">
          <li>How often you're named</li>
          <li>The agents named instead</li>
          <li>Your first fix, with the evidence behind it</li>
        </ul>
        <p className="mt-6 text-sm text-ink-muted">
          It's a small sample, so treat it as a first look. Paid plans ask 12 to 18 questions per branch on up to four assistants, three times each, every week.
        </p>
      </div>
      <div className="rounded-lg border border-hairline bg-surface-raised p-6">
        {user ? (
          <div>
            <h2 className="text-heading text-ink">You already have an account</h2>
            <p className="mt-2 text-ink-muted">
              Free scans are for agencies new to Privett. Add a branch to track it every week, with every answer and fix.
            </p>
            <Link href="/dashboard" className={buttonClasses("primary", "md", "mt-6")}>Go to your dashboard</Link>
          </div>
        ) : (
          <FreeScanForm />
        )}
      </div>
    </section>
  );
}
