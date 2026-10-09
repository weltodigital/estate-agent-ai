import { FreeScanForm } from "@/components/marketing/free-scan-form";

export const metadata = { title: "Free AI visibility scan" };

export default function FreeScanPage() {
  return (
    <section className="mx-auto grid max-w-5xl gap-12 px-4 py-16 md:grid-cols-2 md:px-8">
      <div>
        <h1 className="text-5xl leading-tight text-brand-ink">Free AI visibility scan</h1>
        <p className="mt-4 text-brand-walnut">
          We'll ask ChatGPT and Perplexity five questions sellers and landlords ask about agents in your town, and show you:
        </p>
        <ul className="mt-4 space-y-2 text-brand-walnut">
          <li>How often you're named</li>
          <li>The agents named instead</li>
          <li>Your first fix, with the evidence behind it</li>
        </ul>
        <p className="mt-6 text-sm text-brand-slate">
          It's a small sample, so treat it as a first look. Paid plans ask around twenty questions across four assistants, three times each, every week.
        </p>
      </div>
      <div className="rounded-lg border border-brand-stone bg-white p-6 shadow-card">
        <FreeScanForm />
      </div>
    </section>
  );
}
