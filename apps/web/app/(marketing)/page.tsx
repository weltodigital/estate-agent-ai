import Link from "next/link";
import type { ReactNode } from "react";
import { engineLabel, getPlans, type PlanConfig } from "@privett/core";
import { Logo } from "@/components/brand/logo";
import { AnswersDiagram, FixesDiagram, QuestionsDiagram } from "@/components/marketing/home/diagrams";
import { FaqList, FaqSchema } from "@/components/marketing/home/faq";
import { HeroAnswer } from "@/components/marketing/home/hero-answer";
import { ScanForm, TrustLine } from "@/components/marketing/home/scan-form";
import { Reveal } from "@/components/marketing/reveal";
import { StickyCta } from "@/components/marketing/sticky-cta";
import { buttonClasses } from "@/components/ui/button";
import { priceLabel } from "@/lib/billing";
import { getPublicStats } from "@/lib/marketing/stats";
import { cn } from "@/lib/utils";

// Static, revalidated hourly (the live proof numbers are cached for an hour).
export const revalidate = 3600;

const wrap = "mx-auto max-w-6xl px-4 md:px-8";
const band = "py-16 md:py-28";
const h2 = "text-[30px] leading-[36px] font-semibold tracking-[-0.015em] text-ink md:text-[38px] md:leading-[44px]";
const lead = "text-[17px] leading-[27px] text-ink-muted md:text-[18px] md:leading-[28px]";

const QUESTIONS = [
  "Best estate agent in Farnham for a quick sale?",
  "Who gives accurate valuations in Chichester?",
  "Reliable letting agent in Fareham for landlords?",
];

const FEATURES = [
  { shot: "metrics", title: "See how often you're named.", body: "Four numbers that sum up where you stand in AI search, each with the week before beneath it and the answers behind it one click away.", alt: "Privett metric cards: visibility, position, sentiment and share of voice" },
  { shot: "ranking", title: "See who AI recommends instead.", body: "Every agency AI names in your patch, ranked, with you highlighted. Know exactly who you're up against in the answers sellers read.", alt: "Ranked list of agencies AI recommends, with the user's agency highlighted" },
  { shot: "answer", title: "See every answer behind every number.", body: "Read the conversation a seller would see, with your name marked and the sources the assistant used. Asked several times, so you see the pattern, not a fluke.", alt: "An AI answer shown as a conversation, with the agency's name highlighted and run dots below" },
  { shot: "fix", title: "Know exactly what to fix.", body: "A short, ordered list built from your own results, with the evidence behind each fix and a ready-to-paste draft for most.", alt: "A Privett fix card with its evidence and a copyable draft" },
];

const STEPS = [
  {
    Diagram: QuestionsDiagram,
    title: "We ask the questions your clients ask",
    body: "Up to 18 questions per branch, like \"best estate agent in Southsea\" or \"reliable letting agent for landlords in Portsmouth\". Each one goes to up to four assistants (ChatGPT, Perplexity, Gemini and Claude), several times, every week.",
  },
  {
    Diagram: AnswersDiagram,
    title: "We read every answer",
    body: "Who is named, in what order, how they're described and which websites are cited. Every number links back to the answers behind it, so you can read them yourself.",
  },
  {
    Diagram: FixesDiagram,
    title: "We tell you what to fix",
    body: "A short, ordered list built from your own data: the review gap to the agents AI prefers, the directories you're missing from, the pages your site lacks. Most come with a draft ready to paste.",
  },
];

function planBullets(p: PlanConfig): string[] {
  const l = p.limits;
  const engines = l.engines.length === 4 ? "All four assistants" : l.engines.map(engineLabel).join(", ");
  return [
    `${l.promptsPerBranch} questions per branch, asked ${l.runsPerPrompt} times each`,
    p.id === "agency" ? `${engines}, on every branch` : engines,
    p.id === "starter" ? "Scanned every week" : p.id === "agency" ? `From ${l.minBranches} branches, with your whole team` : "Weekly, plus 1 extra scan a month",
  ];
}

function Shot({ name, alt }: { name: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface-raised shadow-pop">
      <picture>
        <source media="(max-width: 767px)" srcSet={`/marketing/shot-${name}-m.webp`} width={750} height={900} />
        <img
          src={`/marketing/shot-${name}.webp`}
          alt={alt}
          width={1200}
          height={750}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full bg-surface-sunken"
        />
      </picture>
    </div>
  );
}

function Section({ children, raised = false, className }: { children: ReactNode; raised?: boolean; className?: string }) {
  return (
    <section className={cn(band, raised ? "border-y border-hairline bg-surface-raised" : "bg-surface", className)}>
      <Reveal className={wrap}>{children}</Reveal>
    </section>
  );
}

export default async function HomePage() {
  const plans = getPlans();
  const paid = [plans.starter, plans.pro, plans.agency];
  const stats = await getPublicStats();

  return (
    <>
      <FaqSchema />

      {/* 2. Hero: the free scan is the hero */}
      <section className="bg-surface pb-16 pt-10 md:pb-24 md:pt-16">
        <div className={cn(wrap, "grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16")}>
          <div className="min-w-0">
            <p className="text-label uppercase text-ink-muted">For UK estate and letting agents</p>
            <h1 className="mt-4 text-[40px] font-semibold leading-[44px] tracking-[-0.025em] text-ink md:text-[64px] md:leading-[68px] xl:text-[72px] xl:leading-[76px]">
              Know where you stand in AI search.
            </h1>
            <p className={cn(lead, "mt-5 max-w-[34rem]")}>
              When a seller in your town asks ChatGPT who to list with, are you named? Privett asks up to four AIs the questions your
              clients ask, every week, and shows you what to fix.
            </p>
            <ScanForm id="hero-form" className="mt-8 max-w-xl" />
            <TrustLine className="mt-3" />
          </div>
          <div className="min-w-0">
            <HeroAnswer />
          </div>
        </div>
      </section>

      {/* 3. Proof strip: honest proof only */}
      <section className="border-y border-hairline bg-surface-raised">
        <div className={cn(wrap, "grid gap-6 py-8 text-small text-ink-muted md:grid-cols-3 md:gap-10")}>
          <p>
            From the team behind <span className="font-semibold text-ink">Subject to Contract</span>, the weekly newsletter for UK estate
            agents.
          </p>
          <p>
            <span className="font-mono font-medium text-ink">84%</span> of UK agents expect AI to become the main way buyers search.{" "}
            <a
              href="https://thenegotiator.co.uk/news/proptech/ai-property-searches-may-become-mainstream-say-agents-but-not-yet/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline-offset-2 hover-fine:underline"
            >
              GetAgent survey of 622 agents
            </a>
          </p>
          {stats ? (
            <p>
              <span className="font-mono font-medium text-ink">{stats.answers.toLocaleString("en-GB")}</span> AI answers analysed across{" "}
              <span className="font-mono font-medium text-ink">{stats.towns}</span> UK towns.
            </p>
          ) : (
            <p>Every number is counted from real AI answers, and you can read every one of them.</p>
          )}
        </div>
      </section>

      {/* 4. The problem, in agents' words */}
      <Section>
        <h2 className={cn(h2, "max-w-2xl")}>Sellers are asking AI who to list with.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {QUESTIONS.map((q) => (
            <p key={q} className="w-fit max-w-full rounded-lg rounded-br-sm bg-brand-tint px-5 py-4 text-[17px] leading-[26px] text-ink md:ml-auto">
              {q}
            </p>
          ))}
        </div>
        <p className={cn(lead, "mt-8 max-w-[40rem]")}>
          Every AI answers differently, and the answers change week to week. Most agents have never seen what it says about them.
        </p>
      </Section>

      {/* 5. What you get */}
      <Section raised>
        <h2 className={h2}>What you get</h2>
        <div className="mt-12 space-y-16 md:space-y-24">
          {FEATURES.map((f, i) => (
            <div key={f.shot} className="grid items-center gap-8 md:grid-cols-[1fr_1.35fr] md:gap-14">
              <div className={cn("min-w-0", i % 2 === 1 && "md:order-2")}>
                <h3 className="text-[24px] font-semibold leading-[30px] tracking-[-0.01em] text-ink">{f.title}</h3>
                <p className={cn(lead, "mt-3 max-w-[30rem]")}>{f.body}</p>
              </div>
              <div className="min-w-0">
                <Shot name={f.shot} alt={f.alt} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. How it works */}
      <Section>
        <h2 className={h2}>How it works</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map(({ Diagram, title, body }, i) => (
            <div key={title}>
              <div className="flex h-28 items-center rounded-lg border border-hairline bg-surface-raised px-4">
                <Diagram />
              </div>
              <p className="mt-5 font-mono text-data text-ink-muted">Step {i + 1}</p>
              <h3 className="mt-1 text-heading text-ink">{title}</h3>
              <p className="mt-2 text-[17px] leading-[26px] text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
        <Link href="/how-it-works" className="mt-10 inline-block font-medium text-brand underline-offset-2 hover-fine:underline">
          Read how Privett works
        </Link>
      </Section>

      {/* 7. Sample report: the one Evergreen band */}
      <section className={cn(band, "bg-brand text-on-brand")}>
        <Reveal className={cn(wrap, "flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between")}>
          <div>
            <Logo size={28} variant="reverse" />
            <h2 className="mt-6 text-[30px] font-semibold leading-[36px] tracking-[-0.015em] md:text-[38px] md:leading-[44px]">
              See a full example report
            </h2>
            <p className="mt-3 max-w-[34rem] text-[17px] leading-[27px] text-on-brand/80">
              Click around a real Privett dashboard for an example agency: every number, every answer, every fix.
            </p>
          </div>
          <Link href="/sample-report" className={buttonClasses("inverse", "lg", "h-12 shrink-0")}>
            Open the example report
          </Link>
        </Reveal>
      </section>

      {/* 8. Pricing */}
      <Section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className={h2}>Simple monthly pricing</h2>
          <Link href="/pricing" className="font-medium text-brand underline-offset-2 hover-fine:underline">
            Compare plans
          </Link>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {paid.map((p) => {
            const popular = p.id === "pro";
            return (
              <div key={p.id} className={cn("flex flex-col rounded-lg border bg-surface-raised p-6", popular ? "border-brand" : "border-hairline")}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-heading text-ink">{p.name}</h3>
                  {popular ? <span className="rounded-sm bg-signal px-2 py-0.5 text-small font-medium text-on-signal">Most popular</span> : null}
                </div>
                <p className="mt-3 text-title text-ink">{priceLabel(p.id)}</p>
                <ul className="mt-4 flex-1 space-y-2 text-[15px] leading-[22px] text-ink-muted">
                  {planBullets(p).map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Link href="/free-scan" className={buttonClasses(popular ? "primary" : "secondary", "lg", "mt-6 h-12 w-full")}>
                  Start free scan
                </Link>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 9. FAQ */}
      <Section>
        <div className="grid gap-10 md:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className={h2}>Questions agents ask</h2>
            <p className={cn(lead, "mt-3")}>Honest answers, including the ones we can&apos;t promise.</p>
          </div>
          <FaqList />
        </div>
      </Section>

      {/* 10. Closing call to action, on surface-raised */}
      <Section raised>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={h2}>See what AI says about agents in your town.</h2>
          <ScanForm className="mt-8 text-left" />
          <TrustLine className="mt-3" />
        </div>
      </Section>

      <StickyCta targetId="hero-form" />
    </>
  );
}
