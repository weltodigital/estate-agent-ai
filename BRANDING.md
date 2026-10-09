# Privett — Brand Guidelines v1

Privett shows UK estate and letting agents how they appear in AI search, and what to fix. The brand should feel like a precise instrument an agent trusts with a decision: calm, exact, quietly confident. Not a growth-hack tool, not a toy.

**Tagline:** Know where you stand in AI search.

---

## 1. Logo

The mark is a lowercase **p** drawn as an answer bubble. The bowl is the AI's reply, the stem is its tail, and the dot inside is the agent being named.

### Files

**Default mark** (`privett-mark-signal.svg`): Evergreen with the Signal Lime dot. Use on `surface` or `surface-raised` in the light theme.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#0F4C3A" fill-rule="evenodd" d="M14 26A20 20 0 1 1 34 46H28V56A4 4 0 0 1 24 60H18A4 4 0 0 1 14 56ZM41 26A7 7 0 1 0 27 26A7 7 0 1 0 41 26Z"/><circle cx="34" cy="26" r="4.5" fill="#C8F169"/></svg>
```

**One-colour mark** (`privett-mark.svg`): Evergreen only. Use under 20px and for single-colour print.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#0F4C3A" fill-rule="evenodd" d="M14 26A20 20 0 1 1 34 46H28V56A4 4 0 0 1 24 60H18A4 4 0 0 1 14 56ZM41 26A7 7 0 1 0 27 26A7 7 0 1 0 41 26Z"/></svg>
```

**Reverse mark** (`privett-mark-reverse.svg`): white with the lime dot. Use on an Evergreen fill, in the dark theme, or on dark photography.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#FFFFFF" fill-rule="evenodd" d="M14 26A20 20 0 1 1 34 46H28V56A4 4 0 0 1 24 60H18A4 4 0 0 1 14 56ZM41 26A7 7 0 1 0 27 26A7 7 0 1 0 41 26Z"/><circle cx="34" cy="26" r="4.5" fill="#C8F169"/></svg>
```

**App icon** (`privett-app-icon.svg`): favicon, app icon, social avatar.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0F4C3A"/><g transform="translate(78 80) scale(5.25)"><path fill="#FFFFFF" fill-rule="evenodd" d="M14 26A20 20 0 1 1 34 46H28V56A4 4 0 0 1 24 60H18A4 4 0 0 1 14 56ZM41 26A7 7 0 1 0 27 26A7 7 0 1 0 41 26Z"/><circle cx="34" cy="26" r="4.5" fill="#C8F169"/></g></svg>
```

### Wordmark and lockup

- "privett" in lowercase, Instrument Sans SemiBold, letter-spacing -0.03em.
- Sits to the right of the mark. Font size is 0.85× the mark's height (40px mark → 34px text; 24px mark → 20px text), with a 10px gap.
- Outline the text before sending anything to print.

### Rules

- Clear space round the mark is half its width. Minimum size 16px.
- Mark alone (no wordmark) in the collapsed sidebar and favicon.
- Don't stretch, rotate, add effects, set the wordmark in capitals, or recolour the dot anything but Signal Lime.
- Don't place the Evergreen mark on dark surfaces; use the reverse.

---

## 2. Colour

Two hues carry the brand: **Evergreen** and **Signal Lime**. Everything else is warm neutral.

| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | `#F7F7F2` | `#0C1311` | Page background |
| `surface-raised` | `#FFFFFF` | `#141D1A` | Cards, panels, popovers |
| `surface-sunken` | `#EEEEE6` | `#08100D` | Table headers, input wells, raw AI answer blocks |
| `hairline` | `#DCDDD3` | `#26322D` | 1px borders and dividers |
| `ink` | `#0E1A15` | `#ECF0EC` | Primary text and numbers |
| `ink-muted` | `#56625C` | `#9AA7A0` | Secondary text, labels, axis text |
| `brand` (Evergreen) | `#0F4C3A` | `#4FD69C` | Primary buttons, logo, links, active nav, the agent's own data |
| `on-brand` | `#FFFFFF` | `#06140F` | Text and icons on a brand fill |
| `brand-tint` | `#E3EFE8` | `#15342A` | Selected rows, the agent's own table row, ghost hover |
| `signal` (Signal Lime) | `#C8F169` | `#C8F169` | Highlights only: logo dot, "you" marker, new-result badges |
| `on-signal` | `#0E1A15` | `#0E1A15` | Text on a signal fill |
| `data-rival` | `#7E8781` | `#5E6A65` | Every competitor series in charts |
| `data-rival-soft` | `#C9CEC9` | `#2E3A35` | Chart tracks, empty bars, gridlines |
| `up` | `#0E7A52` | `#5BD8A0` | Positive change, with ▲ and + |
| `down` | `#B4441F` | `#FF8A5C` | Negative change, with ▼ and − |
| `warn` | `#8F6200` | `#F2B544` | Low-sample and stale-data notices, with an icon |
| `focus` | `#0F4C3A` | `#C8F169` | 2px solid focus ring, 2px offset |

### Rules

- Cards sit on `surface-raised` with a 1px `hairline` border. Separate with borders, not shadows.
- One primary (`brand`) action per view.
- `signal` is a highlighter, not a fill. Never set text in it, never use it as a section background inside the app.
- `ink` and `ink-muted` pass 4.5:1 on every surface in both themes.

### The data colour rule

**The agent is the only colour on the chart.** Their series, bar and row use `brand`; every competitor uses `data-rival`, with tracks and gridlines in `data-rival-soft`. This answers "where am I?" at a glance and works for colour-blind readers, because you-versus-them never depends on telling two hues apart.

- Change is always `up` + ▲ + sign, or `down` + ▼ + sign. Never colour alone.
- `warn` always comes with an icon and a word ("Low sample").
- The agent's own row in a competitor table sits on `brand-tint`.

---

## 3. Typography

Both fonts are free on Google Fonts.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
```

- **Instrument Sans** for all reading text.
- **Geist Mono** for every number someone compares, and for raw AI answer excerpts, so evidence always looks like evidence.

| Style | Font | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `display` | Instrument Sans | 44 / 48 | 600 | -0.025em | Marketing headlines, free-scan result headline |
| `title` | Instrument Sans | 26 / 32 | 600 | -0.015em | App page titles |
| `heading` | Instrument Sans | 17 / 24 | 600 | -0.005em | Card and section headings |
| `body` | Instrument Sans | 15 / 22 | 400 | 0 | Default UI and reading text |
| `small` | Instrument Sans | 13 / 18 | 400 | 0 | Helper text, tooltips, table cells |
| `label` | Instrument Sans | 12 / 16 | 600 | 0.04em, capitals | Metric labels, table headers, eyebrows |
| `metric` | Geist Mono | 36 / 40 | 500 | -0.03em | Headline number on a metric card |
| `data` | Geist Mono | 13 / 20 | 400 | 0 | Table numbers, deltas, chart labels, AI answer excerpts |

Number formats: positions as `#2.4` (hash, one decimal); percentages without decimals unless under 10% (`62%`, `4.5%`).

---

## 4. Spacing, radius, shadow

| Token | Value | Use |
|---|---|---|
| `space-1` | 4px | Icon-to-text gaps |
| `space-2` | 8px | Gaps inside controls |
| `space-3` | 12px | Table cell padding |
| `space-4` | 16px | Card gutters, button padding |
| `space-6` | 24px | Card padding |
| `space-8` | 32px | Between page sections |
| `space-12` | 48px | Page top padding, marketing rhythm |
| `radius-sm` | 6px | Badges, chart bars, inputs |
| `radius-md` | 10px | Buttons, menus, tooltips |
| `radius-lg` | 16px | Cards and panels |
| `radius-full` | 9999px | Pills, avatars, the "you" dot |
| `shadow-pop` | `0 8px 24px rgba(14,26,21,.12)` (dark: `rgba(0,0,0,.5)`) | Floating layers only |

---

## 5. Components

### Metric card
The four headline metrics sit in one row at the top of the dashboard: **Visibility, Position, Sentiment, Share of voice**.

- `label` text, the number in `metric`, a signed delta, then a footnote with the evidence ("Named in 140 of 225 responses").
- Share of voice can show a mini ranked-bar chart: agent's bar `brand`, competitors `data-rival` on a `data-rival-soft` track.
- Below the sample threshold, replace the delta with a `warn` "Low sample" note.
- Clicking a card opens the responses behind the number.
- Don't colour the big number or show a metric without its sample size.

### Button
- **Primary:** `brand` fill, `on-brand` text. One per view.
- **Secondary:** `surface-raised`, `hairline` border, `ink` text.
- **Ghost:** `brand` text, `brand-tint` on hover. For row actions in tables and fix lists.
- 14/20 SemiBold, `radius-md`, padding `space-2` × `space-4`, `focus` ring.
- Verb-first, sentence-case labels: "Run free scan", "View responses", "Mark as done".
- Never use `signal` as a button fill.

---

## 6. Voice

- **Write like a good surveyor's report.** Plain, specific, short sentences. UK spelling.
- **Second person, singular agency:** "ChatGPT named you in 6 of 10 answers."
- **Every claim carries its evidence.** State the number and its source. Mark weak samples "low sample".
- **Never promise rankings.** Say "visibility", "how often AI names you", "the gap". Avoid "rank #1", "guaranteed", "dominate", "skyrocket".
- **Sentence case** everywhere except `label` text.
- **No emoji** in the product.
- **Agent vocabulary:** instructions, valuations, vendors, landlords, branch, patch.

Examples: "Who AI recommends instead" · "You're missing from 9 selling prompts" · "Add area pages for Southsea and Drayton" · "Low sample: re-scan after 3 more runs".

---

## 7. Imagery and icons

- Show the product and the data, not stock photos of handshakes or keys.
- Photography, where needed: real UK high streets and agency shopfronts, natural light, no heavy filters.
- Illustration is limited to the ranked-bar motif: horizontal bars, grey for competitors, Evergreen for the agent, one lime marker.
- Icons: **Lucide** at 1.5px stroke, 16px in tables and buttons, 20px in navigation, `ink-muted` by default and `brand` when active. A placeholder until a custom set is drawn.

---

## 8. CSS variables

Implemented in `apps/web/app/globals.css` (as RGB channels, so Tailwind opacity modifiers work) and exposed as Tailwind colours in `apps/web/tailwind.config.ts`: `surface`, `surface-raised`, `surface-sunken`, `hairline`, `ink`, `ink-muted`, `brand`, `brand-tint`, `on-brand`, `signal`, `on-signal`, `rival`, `rival-soft`, `up`, `down`, `warn`, `focus`. Logo files are in `apps/web/public/`; the `<Logo />` and `<LogoMark />` components are in `apps/web/components/brand/logo.tsx`.

```css
:root, [data-theme="light"] {
  --surface: #f7f7f2;
  --surface-raised: #ffffff;
  --surface-sunken: #eeeee6;
  --hairline: #dcddd3;
  --ink: #0e1a15;
  --ink-muted: #56625c;
  --brand: #0f4c3a;
  --on-brand: #ffffff;
  --brand-tint: #e3efe8;
  --signal: #c8f169;
  --on-signal: #0e1a15;
  --data-rival: #7e8781;
  --data-rival-soft: #c9cec9;
  --up: #0e7a52;
  --down: #b4441f;
  --warn: #8f6200;
  --focus: #0f4c3a;
  --shadow-pop: 0 8px 24px rgba(14, 26, 21, 0.12);
}

[data-theme="dark"] {
  --surface: #0c1311;
  --surface-raised: #141d1a;
  --surface-sunken: #08100d;
  --hairline: #26322d;
  --ink: #ecf0ec;
  --ink-muted: #9aa7a0;
  --brand: #4fd69c;
  --on-brand: #06140f;
  --brand-tint: #15342a;
  --signal: #c8f169;
  --on-signal: #0e1a15;
  --data-rival: #5e6a65;
  --data-rival-soft: #2e3a35;
  --up: #5bd8a0;
  --down: #ff8a5c;
  --warn: #f2b544;
  --focus: #c8f169;
  --shadow-pop: 0 8px 24px rgba(0, 0, 0, 0.5);
}

:root {
  --font-sans: "Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px;
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-full: 9999px;
}
```
