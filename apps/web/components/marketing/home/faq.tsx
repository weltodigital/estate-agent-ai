import Link from "next/link";
import type { ReactNode } from "react";

// One list drives both the accordion and the FAQPage structured data, so they
// can't drift apart. `text` is the plain version used in the JSON-LD.
export const FAQS: { q: string; a: ReactNode; text: string }[] = [
  {
    q: "Will this get me to number one in ChatGPT?",
    text: "No one can promise that. We show you how often you're named, why others are named instead, and what to fix, then measure whether it worked.",
    a: "No one can promise that. We show you how often you're named, why others are named instead, and what to fix, then measure whether it worked.",
  },
  {
    q: "Is this just SEO?",
    text: "Related, but different. AI answers lean on reviews, comparison sites and clear website content, not just Google rankings.",
    a: "Related, but different. AI answers lean on reviews, comparison sites and clear website content, not just Google rankings.",
  },
  {
    q: "Will my results match what I see on my phone?",
    text: "Not always. AI answers vary between runs and between people. That's why we ask every question several times and report how often you're named, not one answer.",
    a: "Not always. AI answers vary between runs and between people. That's why we ask every question several times and report how often you're named, not one answer.",
  },
  {
    q: "Which AIs do you check?",
    text: "ChatGPT, Perplexity, Gemini and Claude. Starter covers ChatGPT, Perplexity and Gemini; Pro and Agency cover all four.",
    a: "ChatGPT, Perplexity, Gemini and Claude. Starter covers ChatGPT, Perplexity and Gemini; Pro and Agency cover all four.",
  },
  {
    q: "Do I need a developer?",
    text: "No. Most fixes come as ready-to-paste text, and the rest have step-by-step guides.",
    a: "No. Most fixes come as ready-to-paste text, and the rest have step-by-step guides.",
  },
  {
    q: "How long does it take to see a change?",
    text: "Some fixes, such as reviews and listings, can show within weeks. We track it every week, so you can see what moved.",
    a: "Some fixes, such as reviews and listings, can show within weeks. We track it every week, so you can see what moved.",
  },
  {
    q: "Can I cancel any time?",
    text: "Yes. Billing is monthly and you can cancel any time from your billing page.",
    a: "Yes. Billing is monthly and you can cancel any time from your billing page.",
  },
  {
    q: "What do you do with my data?",
    text: "We store the AI answers and your results so you can see them. We don't sell them. The privacy page has the details.",
    a: (
      <>
        We store the AI answers and your results so you can see them. We don&apos;t sell them. The{" "}
        <Link href="/privacy" className="text-brand underline-offset-2 hover-fine:underline">
          privacy page
        </Link>{" "}
        has the details.
      </>
    ),
  },
];

export function FaqSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.text } })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function FaqList() {
  return (
    <div className="divide-y divide-hairline rounded-lg border border-hairline bg-surface-raised">
      {FAQS.map((f) => (
        <details key={f.q} className="group">
          <summary className="ring-brand-focus flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-ink">
            {f.q}
            <span className="text-ink-muted transition-transform duration-150 ease-out group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <p className="px-5 pb-5 text-[17px] leading-[26px] text-ink-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
