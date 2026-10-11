# Privett — Making the marketing site beautiful (and convert)

A spec for Claude Code, alongside `privett-brand.md` and `privett-ux-spec.md`. It covers the homepage first, then pricing and supporting pages.

## Where the site is today

The current homepage has a good headline and a clear free-scan offer, but it is all words:

- **No product shown.** Not one screenshot, answer or chart.
- **The free scan form is at the bottom.** The hero only has buttons.
- **No proof.** No customers, numbers, or reason to trust the people behind it.
- **No prices on the homepage,** and no FAQ on either page.

The good news: the hard parts (headline, the "we can't promise rankings" honesty, the free scan itself) are right. This is mostly about showing rather than telling.

## What makes a SaaS marketing site beautiful

- **The value in 10 seconds.** People decide whether to stay within about 10 seconds, and most read only around a quarter of the words on a page. The headline, the product and the action must land before any scrolling.
- **Show the real product.** Most strong SaaS heroes show the actual interface, not illustrations or stock photos. For Privett the most persuasive picture isn't the dashboard, it's **an AI answer naming one agent and not another.**
- **One action, everywhere.** One primary call to action ("Run free scan"), repeated, never competing with a second "sign up".
- **Proof near every decision point:** below the hero, next to the form, before pricing.
- **Fast and steady.** Load in under 2.5s and don't shift as it loads. Farfetch measured conversion falling about 1.3% for every extra 100ms of load time past 2.5s.
- **Its own look.** Not the dark-gradient "Linear style" every AI startup copies. Privett's warm off-white, Evergreen and one lime highlight already look different from Profound and Peec AI; lean into that.

---

## The homepage, section by section

### 1. Header
- Logo · How it works · Pricing · Sign in · **Run free scan** (the only button).
- Sticky, `surface` background with a hairline border that appears only after scrolling.
- Mobile: logo + "Free scan" button + menu.

### 2. Hero: the free scan *is* the hero

**Left column (text):**
- Eyebrow (`label`): FOR UK ESTATE AND LETTING AGENTS
- H1 (`display`, 64–72px desktop, 40px mobile): **Know where you stand in AI search.**
- Subhead (18px, `ink-muted`): When a seller in your town asks ChatGPT who to list with, are you named? Privett asks four AIs the questions your clients ask, every week, and shows you what to fix.
- **Inline form:** two fields side by side, **Your website** and **Town**, then a **Run free scan** button. Agency name (prefilled from the website's title) and email come on step 2, so the hero asks for almost nothing.
- Trust line beneath (`small`): Free · About 3 minutes · No card needed · Results by email.

**Right column (the picture): a live AI answer.**
- A chat card styled exactly like the in-app answer card: the question "Who's the best estate agent in Southsea?" as a user bubble, then an AI answer that **types out once** on load (~2s), naming three agencies. The second name gets the Signal Lime underline as it appears, with a small tag: *That's you.*
- Below the card, the ranked bars (grey competitors, one Evergreen bar with the lime dot) building in once.
- Use **invented agency names** (e.g. "Harbour & Hale", "Marsh Lettings"), never real firms without permission.
- Reduced motion: show the finished state instantly.

This picture says the whole product in one look: AI is answering your clients, and you can see whether you're in the answer.

### 3. Proof strip (directly under the hero)
Privett has no customers yet, so use honest proof, never invented testimonials:
- **Founder credibility:** "From the team behind *Subject to Contract*, the weekly newsletter for UK estate agents."
- **Real data:** "X answers analysed across Y UK towns" — pull live counts from the database; hide the line until the numbers are meaningful.
- **Market context, sourced:** "84% of UK agents expect AI to become the main way buyers search" (GetAgent survey of 622 agents).
- Later, replace with 3–5 agency logos and a named quote with a specific result ("Named in 2 of 30 answers in July, 19 of 30 in September — Jane Smith, Director, [Agency]").

### 4. The problem, in agents' words
Heading: **Sellers are asking AI who to list with.**
- Three question cards in a row, as chat bubbles: "Best estate agent in Farnham for a quick sale?", "Who gives accurate valuations in Chichester?", "Reliable letting agent in Fareham for landlords?"
- One line under them: "Every AI answers differently, and the answers change week to week. Most agents have never seen what it says about them."

### 5. What you get (three or four blocks)
Alternate text-left / image-right. Each block: an outcome heading, one sentence, a **real screenshot** (2× resolution, cropped tight, on a `surface-raised` card with a hairline border and `shadow-pop`), using the demo agency's data.

1. **See how often you're named.** The four metric cards, with the previous week beneath.
2. **See who AI recommends instead.** The ranked bars and the competitor table.
3. **See every answer behind every number.** An answer card with the "named in 3 of 5 runs" dots.
4. **Know exactly what to fix.** A fix card with its evidence and a copyable draft.

### 6. How it works (keep, add pictures)
Three steps in a row, each with a small diagram in the brand style (questions → answers → fixes) instead of numbers alone. Keep the existing copy; it's good.

### 7. Sample report
A full-width Evergreen band (the one dark section on the page, reverse logo):
**See a full example report** → link to a public, read-only demo dashboard for the invented agency. Agents who won't run a scan yet will happily click around a real-looking report. This is the strongest "show the product" move available.

### 8. Pricing on the homepage
Privett is self-serve, so show the prices: three compact plan cards (Starter £39, Pro £99, Agency £79 per branch), each with 3 bullet points and "Start free scan". Pro marked "Most popular". Link: "Compare plans".

### 9. FAQ (objections, answered honestly)
Six to eight questions in an accordion. These also become FAQ structured data, which helps Privett itself get cited by AI.

- **Will this get me to number one in ChatGPT?** No one can promise that. We show you how often you're named, why others are named instead, and what to fix, then measure whether it worked.
- **Is this just SEO?** Related, but different: AI answers lean on reviews, comparison sites and clear website content, not just Google rankings.
- **Will my results match what I see on my phone?** AI answers vary between runs and users. That's why we ask every question several times and report rates, not one answer.
- **Which AIs do you check?** ChatGPT, Perplexity, Gemini and Claude.
- **Do I need a developer?** No. Most fixes come as ready-to-paste text; the rest have step-by-step guides.
- **How long does it take to see a change?** Some fixes (reviews, listings) can show within weeks; we track it every week so you can see.
- **Can I cancel anytime?** Yes, monthly billing, cancel in one click.
- **What do you do with my data?** Link to the privacy page.

### 10. Closing call to action
Repeat the hero form on `surface-raised`: **See what AI says about agents in your town.** Website + Town + Run free scan.

### 11. Footer
Logo, tagline, links (How it works, Pricing, Sample report, Methodology, Privacy, Terms, /bot), "A Welto Limited company", the honest disclaimer.

---

## The free scan flow (it's part of the marketing site)

- **Step 1** (hero): website + town.
- **Step 2:** agency name (prefilled) + email, with "Why we ask: we email your results and limit free scans to one per agency."
- **Step 3:** the live scan screen from the UX spec: engines filling, names appearing, the agent's name lighting up in lime.
- **Result page:** visibility, who's named instead, the first fix, locked fixes count, and two actions: **Start tracking from £39** and **Share this result**.
- The result page is the single most important marketing page. Treat it with the same craft as the homepage.

---

## Supporting pages

| Page | Purpose | Key elements |
|---|---|---|
| **Pricing** | Choose a plan | Plan cards, full comparison table, "every paid plan includes" list, FAQ (billing, VAT, branches, cancelling), free scan CTA |
| **Sample report** | Show the product without a scan | Public read-only dashboard for the invented agency, banner "This is an example. Run your own free scan." |
| **Methodology** | Earn trust from sceptics | How questions are chosen, how answers are gathered (APIs with live web search), why runs repeat, how names are matched, what we can't promise. Link it from every metric card in the app |
| **About** | Who's behind it | Founder, Subject to Contract, Welto, contact |
| **Town pages** (later) | Local SEO and AI citations | "AI search visibility for estate agents in [Town]": the questions people ask there, anonymised or published league table data, free scan form prefilled with the town |

---

## Visual craft rules

- **Type:** H1 `display` scaled to 64–72px on desktop, section headings 36–40px, body 17–18px for reading, max line length about 65 characters.
- **Rhythm:** sections separated by 96–128px on desktop, 64px on mobile. Alternate `surface` and `surface-raised` bands; one Evergreen band only (sample report).
- **Graphic device:** the ranked-bar motif and the answer bubble from the logo. No stock photos of keys, handshakes or "for sale" boards; no abstract 3D shapes, glowing orbs or purple gradients.
- **Screenshots:** always real UI with realistic data; never blurry, never wider than the content column, consistent crop and frame.
- **Motion:** each section fades up 8px once when it enters view (300ms, ease-out), the hero answer types once, the bars build once. No parallax, no scroll-jacking, no looping animations. All disabled under reduced motion.
- **Colour:** Lime appears only where something is being pointed at (the agent's name, the dot, the "Most popular" tag).

## Speed and technical

- Targets: **LCP under 2.5s, CLS under 0.1, INP under 200ms** on a mid-range phone over 4G.
- Static rendering for all marketing pages; fonts via `next/font` with `display: swap`; screenshots as AVIF/WebP with explicit width and height; below-the-fold images lazy-loaded.
- The hero animation must be CSS/inline SVG, not a video or heavy library.
- **Practise what you preach:** the site should pass every one of Privett's own fixes — valid Organization and SoftwareApplication schema, FAQ schema, `llms.txt`, AI crawlers allowed in robots.txt, a clear About page. Agents will check.

## Mobile

- Hero: headline, subhead, then the two fields stacked full width, then the button. The answer card follows directly beneath.
- A slim sticky "Run free scan" bar appears once the hero form scrolls out of view.
- Tap targets at least 48px; no horizontal scroll; screenshots replaced by tighter mobile crops where text would be too small.

---

## Build order

| Priority | Item |
|---|---|
| **Now** | Hero with inline form and animated answer card · proof strip · "What you get" blocks with real screenshots · FAQ · closing form · two-step free scan |
| **Next** | Sample report page · prices on the homepage · methodology page · pricing page FAQ and comparison table · site passes its own fixes |
| **Later** | Town pages · real testimonials and logos as customers arrive · shareable free scan results |

## Acceptance checklist

- [ ] Five-second test: three agents can say what Privett does and what it costs to try after a five-second look.
- [ ] The free scan can be started from the first screen on desktop and mobile.
- [ ] Every claim with a number links to its source or comes from live data.
- [ ] No invented testimonials, logos or agency names that belong to real firms.
- [ ] Lighthouse mobile: Performance 90+, LCP < 2.5s, CLS < 0.1.
- [ ] Works at 375px with no horizontal scroll.
- [ ] Reduced-motion mode shows final states with no movement.
- [ ] Privett's own free scan, run on useprivett.com, returns no high-priority fixes.

---

## Sources

- [NN/g: How long do users stay on web pages?](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/) — 10–20 second leave window, value proposition within 10 seconds, ~25% of text read
- [Tenet: SaaS hero section best practices](https://www.wearetenet.com/blog/saas-hero-section-best-practices) — product UI in heroes, one primary CTA, light proof near the top
- [DesignRevision: B2B SaaS landing pages](https://designrevision.com/blog/b2b-saas-landing-pages.md) — section order, real screenshots, performance targets
- [SaaS Hero: landing page social proof](https://www.saashero.net/strategy/landing-page-social-proof-examples/) — proof placement, credible testimonials, honest gaps over invented quotes
- [web.dev: Farfetch Core Web Vitals case study](https://web.dev/farfetch/) — conversion vs. load time
- [UX Collective: the rise of Linear-style design](https://bootcamp.uxdesign.cc/the-rise-of-linear-style-design-origins-trends-and-techniques-4fd96aab7646) — the look to avoid copying
- [Profound homepage](https://www.tryprofound.com/) and [Peec AI homepage](https://peec.ai/) — competitor structure: product demo hero, logo bar, metric explainer, FAQ
- [The Negotiator: GetAgent survey of 622 UK agents](https://thenegotiator.co.uk/news/proptech/ai-property-searches-may-become-mainstream-say-agents-but-not-yet/) — 84% expect AI to become the primary way buyers search
