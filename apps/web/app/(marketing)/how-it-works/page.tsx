import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { engineLabel, getPlans } from "@privett/core";
import { buttonClasses } from "@/components/ui/button";
import { COPY } from "@/lib/copy";

export const metadata: Metadata = {
  title: "How Privett works",
  description: "How Privett measures what AI assistants say about estate agents, what each number means, and how fixes are chosen.",
};

const SECTIONS = [
  ["short", "The short version"],
  ["scan", "How a scan works"],
  ["numbers", "What the numbers mean"],
  ["recommends", "Who AI recommends"],
  ["answers", "Answers"],
  ["competitors", "Competitors"],
  ["sources", "Sources"],
  ["fixes", "Fixes"],
  ["visits", "Website visits"],
  ["faq", "Questions agents ask"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-hairline pt-10">
      <h2 className="text-title text-ink">{title}</h2>
      <div className="mt-4 space-y-4 text-ink-muted [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
    </section>
  );
}

function Metric({ name, plain, example, how }: { name: string; plain: string; example: string; how: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-raised p-5">
      <p className="text-label uppercase text-ink-muted">{name}</p>
      <p className="mt-2 text-ink">{plain}</p>
      <p className="mt-2 text-small">
        <span className="font-medium text-ink">Example:</span> {example}
      </p>
      <p className="mt-1 text-small">
        <span className="font-medium text-ink">How it's worked out:</span> {how}
      </p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-hairline bg-surface-raised">
      <summary className="cursor-pointer list-none px-5 py-4 font-medium text-ink">{q}</summary>
      <div className="space-y-2 px-5 pb-4 text-ink-muted">{children}</div>
    </details>
  );
}

export default function HowItWorksPage() {
  const plans = getPlans();
  const paid = [plans.starter, plans.pro, plans.agency];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8">
      <p className="text-label uppercase text-ink-muted">Guide</p>
      <h1 className="mt-2 text-display text-ink">How Privett works</h1>
      <p className="mt-4 text-[17px] leading-[26px] text-ink-muted">
        What we measure, what each number means, and how we decide what you should fix.
      </p>

      <nav aria-label="On this page" className="mt-8 rounded-lg border border-hairline bg-surface-raised p-5">
        <p className="text-label uppercase text-ink-muted">On this page</p>
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {SECTIONS.map(([id, title]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-brand hover:underline">
                {title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 space-y-12">
        <Section id="short" title="The short version">
          <p>
            When a seller or landlord asks ChatGPT, Perplexity, Gemini or Claude &ldquo;who&apos;s the best estate agent in Farnham?&rdquo;,
            the assistant names a handful of agencies. <strong>Privett asks those questions for you every week, records exactly who gets
            named, and shows you how to be named more often.</strong>
          </p>
          <p>
            We don&apos;t guess and we don&apos;t use an AI to make up the numbers. Every figure is counted from real answers we&apos;ve stored, and
            you can read every one of them.
          </p>
        </Section>

        <Section id="scan" title="How a scan works">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <strong>We ask the questions people ask.</strong> Each branch tracks a set of questions about your town and neighbourhoods,
              such as &ldquo;best estate agent in Farnham&rdquo; or &ldquo;reliable letting agent in Bentley&rdquo;. You can edit them in Settings.
            </li>
            <li>
              <strong>We ask each assistant, several times.</strong> AI answers vary from one go to the next, so we ask every question
              three times on each assistant. One answer is a coin toss; three show a pattern.
            </li>
            <li>
              <strong>We read every answer.</strong> We note every agency named, the order they&apos;re named in, how each is described, and
              the websites the assistant used to answer.
            </li>
            <li>
              <strong>We recognise you, and everyone else.</strong> We match names to your branch (including other names you&apos;re known
              by) and to the agencies around you. If we&apos;re not sure a name is you, we flag it rather than count it.
            </li>
            <li>
              <strong>We check your website and Google profile</strong> for the things assistants rely on, then turn the gaps into fixes.
            </li>
          </ol>
          <p>
            Paid plans scan every week, and you can run one extra scan a week with <strong>Scan now</strong>. A scan usually takes a few
            minutes.
          </p>
        </Section>

        <Section id="numbers" title="What the numbers mean">
          <p>
            One <strong>answer</strong> is one question, asked once, on one assistant. Every number below is counted across the answers
            from the last 30 days.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Metric
              name="Visibility"
              plain="How often AI names you when people ask for an agent in your area. This is the number to watch."
              example="37% means you were named in 37 of every 100 answers."
              how="answers that name you, divided by all answers."
            />
            <Metric
              name="Position"
              plain="Where you appear in the list when AI does name you. Lower is better: #1 means named first."
              example="#3.1 means you're usually the third agency mentioned."
              how="your average place in the list, only counting answers that name you."
            />
            <Metric
              name="Sentiment"
              plain="How positively AI describes you, from 0 to 100. Around 50 is neutral; above 60 is favourable."
              example="64 means AI generally speaks well of you."
              how="each answer that names you is scored, then averaged."
            />
            <Metric
              name="Share of voice"
              plain="Your share of all the agency mentions in your area. It shows how crowded the field is."
              example="7.9% means 1 in every 13 mentions of any agency was you."
              how="your mentions, divided by mentions of every agency in the same answers."
            />
          </div>
          <p>
            Next to each number you&apos;ll see the change from the previous 30 days and how many answers it&apos;s based on. When a number
            is based on only a few answers, it&apos;s marked <strong>Low sample</strong>: treat it as early, not settled.
          </p>
        </Section>

        <Section id="recommends" title="Who AI recommends">
          <p>
            The ranked list on your overview shows every agency AI names in your area, ordered by share of voice, with your row
            highlighted. &ldquo;You&apos;re #4 of 61&rdquo; means 61 different agencies were named in answers about your area, and three were
            mentioned more often than you.
          </p>
          <p>The agencies at the top are the ones AI currently trusts most for your patch. They&apos;re who you&apos;re competing with for these answers.</p>
        </Section>

        <Section id="answers" title="Answers">
          <p>
            The <strong>grid</strong> at the top of Answers shows each question you track against each assistant. Darker squares mean
            you&apos;re named more often. A pale column is an assistant that rarely names you; a pale row is a question you lose
            everywhere. Click any square to read those answers.
          </p>
          <p>
            Each answer is shown as the conversation a seller would see: their question, then the assistant&apos;s reply. Your name is
            underlined in lime, other agencies are in bold, and the numbered chips are the websites the assistant used.
            &ldquo;Named in 2 of 3 runs&rdquo; shows how consistent the assistant was when asked the same thing three times.
          </p>
        </Section>

        <Section id="competitors" title="Competitors">
          <p>
            You don&apos;t have to tell us who your competitors are. Any agency an assistant names in answer to your questions is added
            automatically, with the same four numbers as you, so you can compare like for like.
          </p>
          <p>
            <strong>Pin</strong> the agencies you watch most closely. <strong>Hide</strong> anything that isn&apos;t really a competitor, such
            as a moving company or a firm outside your market. Hiding removes it from your lists without changing anyone&apos;s numbers.
          </p>
        </Section>

        <Section id="sources" title="Sources">
          <p>
            Assistants search the web before they answer, and the sites they read shape who they name. Sources shows those sites,
            and whether any page on each one is about you.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Third-party sites</strong> such as Rightmove, Zoopla, Trustpilot and GetAgent are where you can be listed or reviewed.
              If an assistant reads a site for other agencies but finds nothing about you there, that&apos;s a <strong>gap</strong>, and it
              becomes a fix.
            </li>
            <li>
              <strong>Agency websites</strong> belong to your competitors. They&apos;ll never mention you, so they&apos;re labelled as agency sites
              and never treated as gaps.
            </li>
          </ul>
        </Section>

        <Section id="fixes" title="Fixes">
          <p>
            Fixes are the specific changes most likely to give assistants more reasons to name you. Each one comes from your own
            results, never generic advice, and shows the evidence behind it: for example, &ldquo;AI used Trustpilot in 44 answers about
            agents in Farnham, but none of the pages it read were about you.&rdquo;
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Do these first</strong> are the most important; <strong>Then these</strong> can follow.
            </li>
            <li>Many fixes come with a draft to copy, such as structured data for your website, an FAQ, an area page or a review request message. Check every draft before you publish it.</li>
            <li>
              Mark a fix <strong>done</strong> and we&apos;ll check it again on your next scan: <strong>Resolved</strong> means we can see the
              change, <strong>Still present</strong> means we can&apos;t yet.
            </li>
          </ul>
          <p>Changes take time to show up in AI answers, often a few weeks, because assistants have to find and re-read your pages.</p>
        </Section>

        <Section id="visits" title="Website visits">
          <p>
            Add one line of code to your website and Privett counts visitors who arrive from ChatGPT, Perplexity, Gemini, Copilot and
            Claude, and which pages they land on. It sets no cookies and records no personal data. You&apos;ll find the snippet, with
            WordPress and Google Tag Manager instructions, under Website visits.
          </p>
        </Section>

        <Section id="faq" title="Questions agents ask">
          <div className="space-y-3">
            <Faq q="Why do the answers keep changing?">
              <p>
                Assistants don&apos;t give the same answer every time, and they search the web afresh. That&apos;s why we ask every question
                several times and report how often you&apos;re named, rather than relying on one answer.
              </p>
            </Faq>
            <Faq q="Can you guarantee AI will recommend us?">
              <p>{COPY.noPromise} What we can do is show you exactly where you stand, what&apos;s behind it, and what to change.</p>
            </Faq>
            <Faq q="Why is my result different from when I asked ChatGPT myself?">
              <p>
                Your own ChatGPT may know your location, your history and your past chats, which changes its answers. We ask from a
                clean, UK-based starting point every time, so results are comparable week to week and with your competitors.
              </p>
            </Faq>
            <Faq q="Why is an agency listed as a competitor when it isn't one?">
              <p>
                We list every agency an assistant names for your questions. Occasionally that includes firms that aren&apos;t really
                competitors. Hide them on the Competitors tab.
              </p>
            </Faq>
            <Faq q="Which assistants does my plan include?">
              <ul className="list-disc space-y-1 pl-5">
                {paid.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}:</strong> {p.limits.engines.map(engineLabel).join(", ")}, {p.limits.promptsPerBranch} questions per
                    branch, asked {p.limits.runsPerPrompt} times each, every week.
                  </li>
                ))}
              </ul>
            </Faq>
            <Faq q="How long until fixes make a difference?">
              <p>
                Usually a few weeks. Assistants need to find and re-read the pages you&apos;ve changed. We record when you mark each
                fix done and check it again on every scan after, so you can see what changed.
              </p>
            </Faq>
            <Faq q="Do you use our data to train AI?">
              <p>No. We store the answers assistants give and your results so you can see them. We don&apos;t sell them or use them to train AI models.</p>
            </Faq>
          </div>
        </Section>
      </div>

      <div className="mt-14 rounded-lg border border-hairline bg-surface-raised p-6">
        <p className="text-heading text-ink">See it for your agency</p>
        <p className="mt-1 text-ink-muted">A free scan asks five questions on two assistants and shows who AI names in your town.</p>
        <Link href="/free-scan" className={buttonClasses("primary", "md", "mt-4")}>
          Run free scan
        </Link>
      </div>
    </div>
  );
}
