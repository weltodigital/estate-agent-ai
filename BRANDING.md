# Privett — Brand Reference

This is the canonical brand reference for Privett. Other `CLAUDE.md` files refer here. When you write or change any user-facing copy, colour, or type decision, this file is the source of truth.

> **Note on the logo:** the wordmark in the app is a code-rendered placeholder (Newsreader "Privett"). A proper logo is being designed separately and will replace it. Build everything so that swap is a one-file change.

---

## Name and pronunciation

**Privett.** Always sentence case — never `PRIVETT`, never `privett`. The domain is `useprivett.com`; in body copy always write the name as "Privett", never the URL.

Pronounced **PRIH-vett**. Two syllables, soft.

**One-line description:** Marketing software for UK estate agents. AI-staged photos, branded floor plans from a sketch, listing descriptions that don't read like every other listing.

---

## Voice & tone

Warm, considered, quietly confident. The voice of a thoughtful senior colleague who happens to be brilliant at marketing — not a salesperson, not a robot.

- **UK English throughout** — colour, centre, kerbside, organisation, lounge, garden, lift.
- **Short sentences.** Understatement is a confidence signal.
- **Never shouty, never tech-jargony, never twee.**
- **No exclamation marks** except in error/success toasts.
- **Never "AI-powered"** — say what the thing actually does.
- Avoid over-explanation. If a sentence runs past 20 words, cut it.

**Tagline (primary):** Marketing for property, done properly.
**Tagline (alt, use sparingly):** Better-looking listings, by Tuesday.

### The words we don't use

These are estate-agent and proptech clichés. They never appear in Privett copy:

1. **stunning**
2. **nestled**
3. **boasting**
4. **AI-powered** (say what it does instead)
5. **revolutionary** / **next-generation** / **cutting-edge**
6. **seamless** / **effortless**
7. **unlock** / **supercharge** / **leverage**
8. **intelligent** / **smart** (as a marketing adjective)
9. Americanisms: **optimize**, **color**, **center**, **elevator**, **yard**

When tempted to reach for one, describe the actual behaviour instead.

---

## Colour palette

Brand defaults. Available in Tailwind under `theme.extend.colors.brand` and as CSS custom properties in `apps/web/app/globals.css`. **Per-agency overrides via CSS custom properties always take precedence** — Privett is just the default (see Multi-tenancy below).

| Name        | Hex       | Use                                                             | Tailwind class                                |
| ----------- | --------- | --------------------------------------------------------------- | --------------------------------------------- |
| Hedge Green | `#2E3B36` | Primary brand colour. Headers, primary buttons, brand surfaces. | `bg-brand-hedge` `text-brand-hedge`           |
| Bone        | `#F5F1E8` | Canvas / page background. Warm off-white.                       | `bg-brand-bone`                               |
| Terracotta  | `#B5663D` | Accent. CTAs, key inline links. Use sparingly.                  | `bg-brand-terracotta` `text-brand-terracotta` |
| Sand        | `#C9B8A0` | Secondary surfaces, input fields, dividers.                     | `bg-brand-sand`                               |
| Ink         | `#1A1F1C` | Body text, headings, icons.                                     | `text-brand-ink`                              |

Supporting neutrals:

| Name   | Hex       | Use                                      | Tailwind class       |
| ------ | --------- | ---------------------------------------- | -------------------- |
| Cream  | `#FAF7F0` | Subtle backgrounds, hover states on Bone | `bg-brand-cream`     |
| Stone  | `#E4DFD0` | Borders, dividers                        | `border-brand-stone` |
| Slate  | `#9A968A` | Muted text, secondary icons              | `text-brand-slate`   |
| Walnut | `#4A453A` | Strong secondary text                    | `text-brand-walnut`  |

The semantic tokens (`bg-primary`, `text-foreground`, `--brand-primary`, etc.) point at the brand palette as their defaults, so per-agency colour overrides keep working.

---

## Type system

Two faces, both from Google Fonts, wired via `next/font/google` in `apps/web/app/layout.tsx` with `display: 'swap'` and CSS variables `--font-newsreader` and `--font-inter`. Tailwind's `fontFamily.serif` is Newsreader, `fontFamily.sans` is Inter.

**Newsreader** — display, headings, the wordmark. Weight 400 (occasionally 500 for h3/h4 in app UI). Variable `opsz` axis ranges 6–72: use `font-variation-settings: 'opsz' 72` at display sizes (32px+) and `'opsz' 24` for medium headings (h3/h4 in-app). Tracking runs tighter than a typical serif. **Never use Newsreader below 18px.**

**Inter** — body, UI labels, navigation, numbers. Weights **400 and 500 only**. Never 600 or 700.

| Element                   | Face           | Spec                                 |
| ------------------------- | -------------- | ------------------------------------ |
| h1                        | Newsreader 400 | opsz 72, tracking -0.02em            |
| h2                        | Newsreader 400 | opsz 72, tracking -0.015em           |
| h3                        | Newsreader 500 | opsz 24, tracking -0.01em            |
| h4–h6                     | Inter 500      | —                                    |
| body                      | Inter 400      | line-height 1.6                      |
| UI labels & buttons       | Inter 500      | —                                    |
| Numbers (metrics/billing) | Inter 500      | `font-variant-numeric: tabular-nums` |

**Serif vs sans:** Newsreader for anything expressive and large (headings, the wordmark, hero display, proof-point single words). Inter for everything functional (body copy, navigation, form fields, buttons, tables, numbers).

---

## Logo usage rules

The current wordmark is a **placeholder** rendered in code (`apps/web/components/brand/wordmark.tsx`). A real logo is being designed separately.

- **Wordmark:** "Privett" in Newsreader 400, `font-variation-settings: 'opsz' 72`, `letter-spacing: -0.015em`. Default `text-brand-hedge`; Bone variant on dark backgrounds.
- **Minimum size:** 18px (Newsreader is never used below 18px). Default 24px in the header, 64px on the landing hero.
- **Clear space:** keep at least the height of the "P" clear on all sides.
- **On-light** (Bone / Cream / white): Hedge Green wordmark.
- **On-dark** (Hedge Green / Ink): Bone wordmark.
- **Swapping in the real logo** should be a one-file change — favicons are generated via `ImageResponse` in `icon.tsx` / `apple-icon.tsx`; replacing them with a static `favicon.ico` is the intended path.

---

## Photography style

Natural light. Slightly desaturated. Real UK homes. No flash, no fish-eye, no wide-angle distortion. Rooms look lived-in and considered, not staged-for-a-brochure. Reference aesthetics: **The Modern House** and **Cereal** magazine — quiet, warm, editorial.

---

## Iconography

Lucide icons, stroke width **1.5**. Ink (`#1A1F1C`) or Slate (`#9A968A`) only. **Never green or terracotta** — icons stay neutral so the accent colours keep their meaning.

---

## Multi-tenancy

Privett is the **default** brand. The authenticated app already supports per-agency branding via CSS custom properties set inline from `agencies.brand_colour_primary` (and related fields). Those overrides **always take precedence** over Privett's defaults at runtime. Never remove the override system; Privett simply provides the `:root` defaults it falls back to.

---

## Where copy lives

Every user-facing string lives in one of:

- `apps/web/app/(marketing)/` — marketing site copy
- `apps/web/components/` — component-level UI copy
- `apps/web/lib/copy.ts` — repeated UI strings (empty states, error messages, sign-offs, product name)

Don't bury copy in components scattered across the codebase. Repeated strings belong in `lib/copy.ts`.
