# Claude Code — Privett Brand Application Prompt

> **How to use this:** Open Claude Code in your existing repo, `/clear` if you've got an active session, then paste everything in the **Prompt** section below as one message. This is a single focused session — applying brand to existing code, adding the marketing site, and writing `BRANDING.md`. Don't combine it with other work.
>
> **Model:** Default Sonnet 4.6 is fine throughout — this is implementation work, not hard reasoning.
>
> **Expected duration:** ~45–90 minutes of Claude Code work. You'll want to watch it and push back on any drift, especially on the marketing site copy.

---

## Prompt — apply the Privett brand (paste this verbatim)

You're applying a new brand identity to an existing UK estate agent marketing SaaS. The product is called **Privett**. This session has three jobs, in order:

1. Write `BRANDING.md` at the repo root as the canonical brand reference.
2. Apply the brand throughout the existing app — Tailwind theme, fonts, CSS custom properties, marketing copy, page titles, metadata, favicon, all hard-coded references to "the platform" or similar placeholders.
3. Build out the public marketing pages under `apps/web/app/(marketing)/`.

Read root `CLAUDE.md` and `apps/web/CLAUDE.md` before doing anything else.

### The brand — read this carefully

**Name:** Privett (always sentence case, never PRIVETT, never privett, never Privett.ai in body copy — that's only in the wordmark/URL context). Pronounced PRIH-vett. Two syllables, soft.

**One-line description:** Marketing software for UK estate agents. AI-staged photos, branded floor plans from a sketch, listing descriptions that don't read like every other listing.

**Voice & tone.** Warm, considered, quietly confident. UK English throughout (colour, centre, kerbside, organisation). Never shouty, never tech-jargony, never twee. The voice of a thoughtful senior colleague who happens to be brilliant at marketing — not a salesperson, not a robot. Avoid estate-agent clichés ("stunning", "nestled", "boasting"). Use understatement as a confidence signal. Short sentences. No exclamation marks except in error/success toasts. Never use "AI-powered" — say what it actually does.

**Tagline (primary):** Marketing for property, done properly.
**Tagline (alt, use sparingly):** Better-looking listings, by Tuesday.

### Colour palette

These are the brand defaults. Add them to `tailwind.config.ts` under `theme.extend.colors.brand` and as CSS custom properties in `apps/web/app/globals.css`. Per-agency overrides should still take precedence over these via the existing CSS custom property system — Privett is just the default.

```
Hedge Green   #2E3B36   Primary brand colour. Headers, primary buttons, brand surfaces.
Bone          #F5F1E8   Canvas / page background. Warm off-white.
Terracotta    #B5663D   Accent. CTAs, key inline links. Use sparingly.
Sand          #C9B8A0   Secondary surfaces, input fields, dividers.
Ink           #1A1F1C   Body text, headings, icons.

Supporting neutrals:
Cream         #FAF7F0   Subtle backgrounds, hover states on Bone
Stone         #E4DFD0   Borders, dividers
Slate         #9A968A   Muted text, secondary icons
Walnut        #4A453A   Strong secondary text
```

Update the Tailwind theme so these are available as `bg-brand-hedge`, `text-brand-ink`, `border-brand-stone`, etc. Keep the existing semantic tokens (`bg-primary`, `text-foreground`) pointing at the brand palette as their defaults — that way per-agency colour overrides via CSS custom properties keep working.

### Typography

Two faces, both from Google Fonts.

- **Newsreader** for display, headings, and the wordmark. Always weight 400 (occasionally 500 for h3/h4 in app UI). Variable opsz axis ranges 6–72 — use `font-variation-settings: 'opsz' 72` for display sizes (32px+) and `'opsz' 24` for medium headings (h3/h4 in-app). Never use Newsreader below 18px. Tracking should be tighter than a typical serif: -0.02em for h1, -0.015em for h2, -0.01em for h3.
- **Inter** for body, UI labels, navigation, numbers. Weights 400 and 500 only. Never 600 or 700.

Wire both up via `next/font/google` in `apps/web/app/layout.tsx`. Use `display: 'swap'` and a variable CSS custom property for each (`--font-newsreader`, `--font-inter`). Set Tailwind's `fontFamily.serif` to Newsreader and `fontFamily.sans` to Inter so the existing `font-sans` / `font-serif` utilities work.

Heading defaults across the app:

- h1 — Newsreader 400, opsz 72, tracking -0.02em
- h2 — Newsreader 400, opsz 72, tracking -0.015em
- h3 — Newsreader 500, opsz 24, tracking -0.01em
- h4–h6 — Inter 500
- body — Inter 400, line-height 1.6
- UI labels and buttons — Inter 500
- Numbers in metrics/billing — Inter 500, `font-variant-numeric: tabular-nums`

### Logo — placeholder only (real logo coming separately)

The user is commissioning the proper logo separately. Build a clean placeholder wordmark in code:

- **In the app:** a `<Wordmark />` component at `apps/web/components/brand/wordmark.tsx` that renders "Privett" in Newsreader 400 at the size passed via props, with `font-variation-settings: 'opsz' 72`, `letter-spacing: -0.015em`, in `text-brand-hedge` by default (Bone variant for dark backgrounds). Default size 24px in the header, 64px on the landing hero.
- **Favicon:** generate `apps/web/app/icon.tsx` (Next.js `icon` route) that uses ImageResponse to render a 32×32 Newsreader "P" in Bone on a Hedge Green rounded square. This must be trivially replaceable later — when the real logo arrives, swapping in a static `favicon.ico` should be a one-file change. Add a TODO comment noting this.
- **Apple touch icon:** same approach at `apps/web/app/apple-icon.tsx`, 180×180.
- **OG image:** `apps/web/app/opengraph-image.tsx` at 1200×630. Hedge Green background, Bone Newsreader wordmark centred, sentence-case tagline below in Inter 400 at 32px in Sand.

### Marketing site — `apps/web/app/(marketing)/`

The marketing site is a route group within the existing Next.js app, not a separate package. Build these pages:

**`/` (landing page)**

Single scrolling page, sections in this order. All sections sit on Bone except where noted.

1. **Header** — Wordmark left at 24px. Right side: "Product", "Pricing", "Sign in" as text links in Inter 400 14px, Walnut colour. Then a "Start free trial" button in Hedge Green with Bone text, no border, 8px radius, Inter 500. Sticky on scroll. Border-bottom: 0.5px Stone.

2. **Hero** — Centred. Eyebrow text in 12px uppercase Slate with letter-spacing 0.12em: "Property marketing software for UK agents". H1 in Newsreader 400 at 52px (mobile: 36px), tracking -0.02em, Ink: "Marketing for property,<br/>done properly." Subhead in Inter 400 17px, Walnut, max-width 520px: "AI-staged photos, branded floor plans from a sketch, and listing descriptions that read like a real person wrote them. Built for independent UK agents." Two buttons inline below: primary "Start free trial" in Terracotta with Cream text; secondary "See it in action" with transparent background, 0.5px Walnut border, Hedge Green text. Small print 12px below in Slate: "7 days free. No card needed."

3. **Three-up proof points** on Hedge Green background, generous padding. Three columns. Each has a single word in Newsreader 400 at 32px in Bone — "Stage", "Sketch", "Write" — then 13px Inter 400 in Sand below:
   - Stage: "Empty room photos turned into furnished interiors in five British styles. Choose Modern, Scandi, Traditional, Minimalist or Luxury."
   - Sketch: "Photograph your rough floor plan. We turn it into a branded PDF in under a minute."
   - Write: "Property descriptions that actually sound British. No 'stunning', no 'nestled', no 'boasting'."

4. **The honest story** — Bone background. H2 Newsreader 400 36px tracking -0.015em centred: "Independent agents deserve better tools." Body paragraph below in Inter 400 17px line-height 1.6 Walnut, max-width 640px, centred: "Estate agents spend hours on listing marketing that should take minutes. Privett gives you the tools the big chains have built in-house — virtual staging, branded floor plans, polished descriptions — without the cost or the wait. Upload your photos and sketch on Monday. Listing live by Tuesday."

5. **Feature grid** — Three rows of two columns alternating which side the screenshot/illustration placeholder sits on. For each feature:
   - Left or right side: a placeholder `<div>` 540×360, Sand background, rounded 12px, with a Walnut "preview" label inside (clearly a placeholder — the real screenshots come later). Add a TODO comment.
   - Other side: H3 Newsreader 500 28px, then Inter 400 16px body 3–4 sentences, then a small Terracotta inline link "Learn more →".

   Three features in order:
   - **AI virtual staging.** "Upload a photo of an empty room. Pick a style. Get three furnished variations in a minute. Tuned for UK interiors — John Lewis, not Restoration Hardware."
   - **Floor plans from a sketch.** "Sketch a layout on paper or an iPad. Photograph it. Privett produces a clean, branded floor plan you can drop straight into a brochure or onto a portal."
   - **Listing descriptions that sound human.** "AI-generated property descriptions tuned for the British market. Idiomatic, idiom-aware, jargon-free. Edit them in place or regenerate in a different tone."

6. **Pricing teaser** — Bone. Centred H2 "Pricing that scales with your branch", then four-card grid showing the four tiers with just name + price + listings allowance (full pricing page is a separate route). Card design: Cream background, 0.5px Stone border, 12px radius, padding 24px. Tier name in Newsreader 500 24px. Price in Inter 500 36px tabular-nums with /month in Slate 14px. Listings count line in Inter 400 14px Walnut. Single button at the bottom "Choose this plan" — outline style, Terracotta text. The Pro card has 2px Terracotta border (the only exception to the 0.5px rule) and a small "Most popular" badge above the card name in Terracotta on Cream.

   Tiers:
   - **Starter** — £29 / month — Up to 8 listings
   - **Pro** — £59 / month — Up to 18 listings — _Most popular_
   - **Business** — £99 / month — Up to 35 listings
   - **Agency** — £159 / month — Up to 60 listings

7. **Footer** — Hedge Green background. Wordmark top-left in Bone. Four columns: Product (Features, Pricing, Changelog), Company (About, Contact), Resources (Help, Privacy, Terms), Connect (Email, X, LinkedIn — all `#` for now). Bottom row: small Sand text "© 2026 Privett Ltd. Made in the UK." Plus a single-line statement "Privett is a registered trading name."

**`/pricing`**

Full four-tier comparison. Header same as landing. Then a section with H1 "Pricing" + subhead "Honest, agent-friendly pricing. No setup fees. Cancel anytime." Then the four-card grid same as landing but with full feature lists below the price. Below cards: a "What's included" table comparing tiers row-by-row on allowances and features (Listings/mo, Auto-enhanced photos, AI staging rooms, AI floor plans, Social videos, AI descriptions, EPC lookups, Users, Branches). Pull the actual numbers from `packages/shared/src/constants.ts` if there's a pricing constants file already — if not, hardcode and add a TODO to extract.

Below the table: a Q&A section in two columns (left: questions in Newsreader 500 20px; right: answers in Inter 400 16px Walnut, line-height 1.6). Questions:

- "Can I switch tiers?" — "Anytime, in two clicks. We prorate the difference."
- "What happens if I go over my allowance?" — "We let you know before you hit it. Overages are charged at the per-unit rate listed above — no surprises."
- "Is there a free trial?" — "Seven days, no card required. You can use every feature on every tier."
- "Do you do annual billing?" — "Yes — 10% off on every tier. Ask us when you're ready."
- "Can my whole agency use one account?" — "Yes. Add as many team members as your tier allows. Agency tier is unlimited."

**`/about`**

Short, deliberate page — three paragraphs and a list. H1 "Why Privett". Three Newsreader 400 24px sub-headings each followed by a paragraph:

- "Built for independent agents." — "The big chains have entire marketing teams behind every listing. Independent agents don't — but their clients still expect the same quality of presentation. Privett closes that gap with software."
- "Made in the UK, for UK property." — "Our AI is tuned for British interiors, British vocabulary, and British market conventions. Floor plans use square metres. Descriptions say 'lounge'. EPC ratings are first-class."
- "Honest pricing, honest software." — "No setup fees. No surprise charges. No hidden long-term contracts. Cancel anytime. We tell you what something costs before you spend it."

After the three, a small "Founded in 2026. Based in the UK." line in 13px Slate.

**`/contact`**

Single column, max-width 480px, centred. H1 "Get in touch." Subhead in Inter 400 16px Walnut: "Questions, demos, or just want to see if we're a fit? Drop us a line." Below: a placeholder contact form (Name, Email, Message textarea, "Send" button in Terracotta). Form submission is a TODO — leave a comment with `// TODO: wire to Resend or a form service`. Below the form: a small Walnut paragraph with `hello@privett.ai` linkified.

### App-side changes (the authenticated product, not marketing)

The existing app already has agency-customisable branding via CSS custom properties. Do NOT remove that system. Privett becomes the _default_:

- In `apps/web/app/globals.css`, set the CSS custom property defaults (`--brand-primary: #2E3B36`, etc.) at `:root`. The existing per-agency override system that sets these inline based on `agencies.brand_colour_primary` continues to work — it just overrides Privett's defaults at runtime.
- Where the app currently renders "Marlow" or "the platform" or any placeholder name in the authenticated UI (sidebar header, page titles, email templates, error messages, signup flow copy, signup confirmation emails), replace with "Privett".
- Page metadata: site name "Privett", default title template `%s · Privett`, default description "Marketing software for UK estate agents."
- Email templates (auth emails, invite emails): header uses the Privett wordmark by default. If an agency has set their own logo, it overrides. Sign-off is "— The Privett team" by default.
- Loading states, empty states, error boundaries: any placeholder text gets a Privett voice pass. Empty property list: "No listings yet. Add your first one to get started." Not "You have no items." Failed action: "Couldn't save that. Try again?" Not "Error: 500 Internal Server Error."

### `BRANDING.md` — write this file at the repo root

The canonical brand reference. Other CLAUDE.md files will refer to it. Include:

- **Name and pronunciation**
- **Voice & tone** (the bullets above, fleshed out)
- **The five words we don't use** ("stunning", "nestled", "boasting", "AI-powered", and any others Claude Code can think of from typical proptech copy)
- **The colour palette** with hex codes, when to use each, and the Tailwind class names that map to them
- **Type system** (Newsreader + Inter, weights, sizes per heading level, when to use serif vs sans)
- **Logo usage rules** — minimum size, clear space, on-light vs on-dark lockups, the fact that the current wordmark is a placeholder and a real logo is coming separately
- **Photography style** — natural light, slightly desaturated, real UK homes, no flash, no fish-eye, references _The Modern House_ and _Cereal_ magazine aesthetic
- **Iconography** — Lucide icons stroke 1.5, Ink or Slate colour only, never green or terracotta
- **Multi-tenancy note** — Privett is the default brand; per-agency overrides via CSS custom properties always take precedence in the authenticated app
- **Where to put copy changes** — every user-facing string lives in one of `apps/web/app/(marketing)/`, `apps/web/components/`, or — for repeated UI strings — `apps/web/lib/copy.ts`. Don't bury copy in components scattered across the codebase.

Add a one-line reference from root `CLAUDE.md` pointing to `BRANDING.md` so it's discovered in future sessions.

### Deliverables checklist

When done, the repo should:

1. Have `BRANDING.md` at the root
2. Have root `CLAUDE.md` updated with a reference to `BRANDING.md` and the brand name
3. Have Tailwind theme updated with the Privett palette under `theme.extend.colors.brand`
4. Have Newsreader + Inter wired via `next/font/google` with CSS variables
5. Have `apps/web/app/globals.css` setting brand CSS custom property defaults
6. Have `<Wordmark />` component at `apps/web/components/brand/wordmark.tsx`
7. Have `apps/web/app/icon.tsx`, `apple-icon.tsx`, and `opengraph-image.tsx` generating placeholder brand-coloured assets via ImageResponse
8. Have all five marketing pages built and styled per the spec above (`/`, `/pricing`, `/about`, `/contact`)
9. Have all user-facing placeholder strings in the authenticated app replaced with Privett-voiced copy
10. Have email templates updated with Privett wordmark and sign-off as the default
11. Pass `pnpm typecheck`, `pnpm lint`, and `pnpm build` across all packages
12. Commit as `feat: apply Privett brand identity and marketing site`

### What to skip in this session

- Don't commission, generate, or attempt to design a "proper" logo beyond the Newsreader wordmark placeholder. A real logo is being designed separately. The wordmark + ImageResponse favicons are the stand-in.
- Don't touch the database schema or any business logic. This is presentation only.
- Don't add new dependencies beyond what's needed for the marketing site (Newsreader + Inter via `next/font/google` are the only ones — both should already be supported).
- Don't write blog posts, changelog entries, case studies, testimonials, or anything that requires real content. Use the copy above verbatim. Fictional testimonials and screenshots are explicitly out of scope.
- Don't connect the contact form to anything — leave a clear TODO with a recommended approach (Resend transactional email to `hello@privett.ai` is the suggested path).
- Don't generate fake property photos or AI staging examples for the feature grid — use clean placeholder boxes with `// TODO: replace with real product screenshot` and let the user supply real ones later.

Begin by reading `CLAUDE.md`, `apps/web/CLAUDE.md`, `tailwind.config.ts`, `apps/web/app/globals.css`, and `apps/web/app/layout.tsx` to understand the current state. Then write `BRANDING.md` first — that's the contract. Then apply changes top-down: fonts and palette, then Wordmark + favicon, then app-side copy, then marketing pages, in that order. Commit at the end.

---

## Notes on running this

- **The marketing copy is the bit Claude Code will most likely drift on.** Watch for: clichés sneaking in ("revolutionary", "next-generation"), Americanisms ("optimize", "color"), AI-marketing-speak ("powered by", "intelligent"), and over-explanation. If it drifts, push back with: _"Re-read BRANDING.md's voice section. Rewrite this paragraph keeping every sentence under 20 words and removing any cliché."_
- **The placeholder favicon is going to look fine in dev but you should still replace it within a week.** Even a moderately-good logo from a designer beats a generated Newsreader P, and the trust signal compounds.
- **Per-agency overrides should still work after this prompt.** Quick test: create an agency in dev, set its `brand_colour_primary` to a different hex, log in as that agency, confirm the dashboard renders in the override colour and not Hedge Green.
- **Lighthouse the marketing pages once it lands.** Fonts loaded via `next/font/google` should give you good CLS and LCP scores — if anything looks off, check `font-display: swap` is set.
