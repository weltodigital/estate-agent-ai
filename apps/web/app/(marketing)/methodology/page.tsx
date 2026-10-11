import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { engineLabel, ENGINE_IDS, getPlans, INTENT_GROUPS, INTENT_LABELS } from "@privett/core";
import { COPY } from "@/lib/copy";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How Privett chooses questions, gathers AI answers, matches agency names, attributes sources and calculates each metric.",
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-hairline pt-10">
      <h2 className="text-title text-ink">{title}</h2>
      <div className="mt-4 space-y-4 text-ink-muted [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  const pro = getPlans().pro.limits;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <p className="text-label uppercase text-ink-muted">Methodology</p>
      <h1 className="mt-2 text-display text-ink">How we measure AI visibility</h1>
      <p className="mt-4 text-[17px] leading-[26px] text-ink-muted">
        The detail behind every number, for anyone who wants to check our working. For a plainer introduction, see{" "}
        <Link href="/how-it-works" className="text-brand hover:underline">
          How Privett works
        </Link>
        .
      </p>

      <div className="mt-12 space-y-12">
        <Section id="questions" title="How questions are chosen">
          <p>
            Each branch tracks questions from a shared library, written the way sellers, landlords and buyers actually ask, grouped by
            what they want:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {INTENT_GROUPS.map((g) => (
              <li key={g}>{INTENT_LABELS[g]}</li>
            ))}
          </ul>
          <p>
            Questions are filled in with the branch&apos;s town and the neighbourhoods it covers, for example &ldquo;best letting agent in
            Southsea&rdquo;, and balanced across these groups so no single type dominates. Agents can edit, switch off or add questions
            within their plan.
          </p>
        </Section>

        <Section id="gathering" title="How answers are gathered">
          <p>
            We ask {ENGINE_IDS.map(engineLabel).join(", ")} through their official APIs, with each assistant&apos;s live web search turned
            on, so answers reflect what they find on the web today rather than only what they learned in training. We use current
            models, kept up to date as the providers release new ones, and set the location to the UK and the branch&apos;s town where the
            assistant supports it.
          </p>
          <p>
            Every question starts from a clean slate: no account history, no previous conversation, no personal settings. That keeps
            results comparable from week to week and between agencies, and is why they can differ from what you see in your own
            logged-in app.
          </p>
        </Section>

        <Section id="runs" title="Why each question is asked more than once">
          <p>
            AI answers vary from one go to the next. On paid plans we ask every question <strong>{pro.runsPerPrompt} times</strong> on each
            assistant, every week, and report how often you&apos;re named across all of those answers. One answer is a snapshot; a rate
            across many is a measurement.
          </p>
          <p>When a figure rests on only a few answers, we mark it Low sample rather than present it as settled.</p>
        </Section>

        <Section id="reading" title="How answers are read and names matched">
          <p>
            Each answer is stored word for word. A language model then reads it and lists every estate or letting agency it names, in
            order, with how the answer describes each one and the websites it cites. Portals, review sites and solicitors are left out.
          </p>
          <p>
            We match those names to your branch and its competitors. Matching ignores punctuation, generic words like &ldquo;Estate
            Agents&rdquo; and &ldquo;Ltd&rdquo;, and town or neighbourhood suffixes, so &ldquo;Hunters Southsea&rdquo; and &ldquo;Hunters&rdquo;
            count as one agency. A website that clearly belongs to an agency also counts as a match.
          </p>
          <p>
            When a name only partly matches, such as a sub-brand, we <strong>flag it for review instead of counting it</strong>. An answer
            that couldn&apos;t be read at all is left out of every figure, never counted as &ldquo;not named&rdquo;.
          </p>
        </Section>

        <Section id="sources" title="How sources are attributed">
          <p>
            A cited website counts for an agency only when the cited page is about that agency, for example its profile page on a
            directory. Appearing in the same answer isn&apos;t enough, because a well-known agency appears alongside almost every common
            source.
          </p>
          <p>
            Agencies&apos; own websites are labelled as agency sites and never treated as gaps: a competitor&apos;s website will never mention
            you. Gaps are third-party sites, such as directories and review platforms, that AI reads for other agencies but where it found
            nothing about you.
          </p>
        </Section>

        <Section id="metrics" title="What each metric means">
          <p>
            Visibility, Position, Sentiment and Share of voice are each counted from stored answers using one shared set of formulas, so
            every screen and report agrees. Plain-English definitions with examples are in{" "}
            <Link href="/how-it-works#numbers" className="text-brand hover:underline">
              What the numbers mean
            </Link>
            . Every number in the app links to the answers behind it.
          </p>
        </Section>

        <Section id="fixes" title="How fixes are chosen">
          <p>
            Fixes come from rules applied to your own results, website and Google profile. A rule only produces a fix when we have
            the evidence for it, and each fix shows that evidence. When you mark a fix done, we check it again on the next scan.
          </p>
        </Section>

        <Section id="limits" title="What we can't promise">
          <p>{COPY.noPromise}</p>
          <p>
            AI assistants change how they answer, which sources they read and which models they run. We measure what they say,
            consistently, and show you the evidence. We don&apos;t control what they say.
          </p>
        </Section>
      </div>
    </div>
  );
}
