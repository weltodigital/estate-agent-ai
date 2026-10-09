import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

const METRICS = [
  { name: "Visibility", line: "How often AI names you when people ask for an agent in your area.", how: "Answers that name you, out of every answer we collect." },
  { name: "Position", line: "Where you appear in the list when AI does name you.", how: "Your average place among the agents named. #1 means named first." },
  { name: "Sentiment", line: "How AI describes your agency.", how: "A 0 to 100 score, with the words assistants actually use about you." },
  { name: "Share of voice", line: "Your share of all agent mentions in your area.", how: "Your mentions, against every agent mentioned in the same answers." },
];

const STEPS = [
  {
    title: "We ask the questions your clients ask",
    body: "Around twenty questions per branch, like \"best estate agent in Southsea\" or \"reliable letting agent for landlords in Portsmouth\". Each one goes to ChatGPT, Perplexity, Gemini and Claude, several times, every week.",
  },
  {
    title: "We read every answer",
    body: "Who is named, in what order, how they're described and which websites are cited. Every number links back to the answers behind it, so you can read them yourself.",
  },
  {
    title: "We tell you what to fix",
    body: "A short, ordered list built from your own data: the review gap to the agents AI prefers, the directories you're missing from, the pages your site lacks. Most come with a draft ready to paste.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 md:px-8 md:pt-24">
        <p className="text-sm uppercase tracking-wide text-brand-terracotta">For UK estate and letting agents</p>
        <h1 className="mt-4 max-w-4xl text-5xl leading-tight text-brand-ink md:text-6xl">
          When a seller in your town asks AI who to list with, are you named?
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-brand-walnut">
          Privett tracks how ChatGPT, Perplexity, Gemini and Claude answer when sellers and landlords ask for an agent in your area. If you're not named, it shows you why, and what to fix.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/free-scan" className={buttonClasses("accent", "lg")}>Run a free scan</Link>
          <Link href="/pricing" className={buttonClasses("secondary", "lg")}>See plans</Link>
        </div>
        <p className="mt-3 text-sm text-brand-slate">Free scan takes a few minutes. No card needed.</p>
      </section>

      <section id="how" className="border-y border-brand-stone bg-brand-cream">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <h2 className="text-4xl text-brand-ink">How it works</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title}>
                <p className="font-serif text-3xl text-brand-terracotta">{i + 1}</p>
                <h3 className="mt-2 text-xl">{s.title}</h3>
                <p className="mt-2 text-brand-walnut">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <h2 className="text-4xl text-brand-ink">Four numbers, all traceable</h2>
        <p className="mt-3 max-w-2xl text-brand-walnut">
          AI answers change from one run to the next, so we never report a single answer. We report rates across hundreds of them, and show you every one.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {METRICS.map((m) => (
            <div key={m.name} className="rounded-lg border border-brand-stone bg-white p-6 shadow-card">
              <h3 className="text-2xl">{m.name}</h3>
              <p className="mt-2 text-brand-ink">{m.line}</p>
              <p className="mt-2 text-sm text-brand-slate">{m.how}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand-hedge text-brand-bone">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <h2 className="max-w-3xl text-4xl">See what AI says about agents in your town</h2>
          <p className="mt-4 max-w-2xl text-brand-sand">
            Enter your website and town. We'll show how often you're named, who is named instead, and your first fix.
          </p>
          <Link href="/free-scan" className={buttonClasses("accent", "lg", "mt-8")}>Run a free scan</Link>
          <p className="mt-8 max-w-2xl text-xs text-brand-sand">{COPY.noPromise}</p>
        </div>
      </section>
    </>
  );
}
