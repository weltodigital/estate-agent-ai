import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description: "Privett is made by Welto Limited, the team behind Subject to Contract, the weekly newsletter for UK estate agents.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <p className="text-label uppercase text-ink-muted">About</p>
      <h1 className="mt-2 text-display text-ink">Who&apos;s behind Privett</h1>
      <div className="mt-6 space-y-4 text-[17px] leading-[26px] text-ink-muted">
        <p>
          Privett is made by <strong className="font-semibold text-ink">Welto Limited</strong>, the team behind{" "}
          <strong className="font-semibold text-ink">Subject to Contract</strong>, the weekly newsletter for UK estate agents.
        </p>
        <p>
          Sellers and landlords have started asking AI assistants which agent to use, and each assistant answers differently, week to
          week. Most agents have never seen what those answers say about them. We built Privett so any agency can see whether it&apos;s
          named, who&apos;s named instead and why, with every answer there to read, and a clear list of what to fix.
        </p>
        <p>
          We report what AI assistants say; we don&apos;t sell rankings. If something in Privett looks wrong, we want to hear about it.
        </p>
      </div>

      <div className="mt-10 rounded-lg border border-hairline bg-surface-raised p-6">
        <h2 className="text-heading text-ink">Get in touch</h2>
        <p className="mt-2 text-ink-muted">
          Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <Link href="/free-scan" className={buttonClasses("primary", "md", "mt-4")}>
          Run free scan
        </Link>
      </div>
    </div>
  );
}
