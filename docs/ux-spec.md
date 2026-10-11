# Privett — Making it beautiful to use

A spec for Claude Code. It builds on `privett-brand.md` (tokens, type, the "only you in colour" rule) and the current app (7 tabs, four metric cards, fixes, referrals). Every element below names the screen it belongs to and how to tell it's done.

## What "beautiful" means for Privett

The products people call beautiful (Linear, Stripe, Plausible) aren't decorated. They feel **calm, fast and certain**. For an estate agent opening Privett, that means three things:

1. **The answer in five seconds.** Open the app and know, without reading, whether you're winning or losing in AI search and what to do next. A good test: show the screen for five seconds, hide it, and ask what they remember. If they can't say their visibility and their top fix, the hierarchy is wrong.
2. **It never feels slow or broken.** Every click responds instantly; every wait is explained.
3. **Every number is believable.** Context beside every figure, the evidence one click away, and nothing that looks like a guess.

Design principles to hold every screen to:

- **Quiet chrome, loud content.** Navigation, borders and labels recede; the agent's own data is the brightest thing on screen. (Linear's recent redesign dimmed its sidebar and softened its separators for exactly this reason: "Don't compete for attention you haven't earned.")
- **Answer first, evidence second.** Summary at the top, trend in the middle, detail tables below or one click in.
- **Colour means something.** Evergreen = you. Grey = everyone else. Lime = the one thing to look at. Red/green only for change, always with ▲▼ and a sign.
- **No number without context.** Every metric shows its previous period, its trend and its sample size.

---

## 1. The overview: one screen that answers the question

Replace the current Overview with a single screen an agent can read standing up. Order, top to bottom:

### 1a. The headline sentence
A plain-English summary generated from the metrics by **template, not by an LLM**, so it can never be wrong:

> **ChatGPT, Perplexity, Gemini and Claude named you in 62% of answers this week**, up from 54%. **Hunters** was named most often. Your biggest gap is **Claude**, which named you in 2 of 30 answers.

- Set in `title`, with the key numbers in `brand`.
- Below it, one line in `small` / `ink-muted`: "Last scanned Tuesday 08:14 · next scan Tuesday 20 Oct · based on 540 answers".
- Done when: the sentence updates every scan, handles first scan ("This is your first week…"), low sample and no change.

### 1b. The four metric cards (keep, refine)
Already built. Add:
- **Previous period** in small text beneath the number ("54% last week"), as well as the delta.
- **A monochrome sparkline** (last 8 weeks) in `data-rival` with the latest point in `brand`. No axes.
- Done when: every card shows value, delta, previous value, sparkline and sample size, and nothing jumps when data loads.

### 1c. "Who AI recommends in [town]" — the signature visual
A ranked horizontal bar list of the top 8 agencies by share of voice. Every bar `data-rival`, **the agent's own bar `brand` with a Signal Lime dot**, its row on `brand-tint`, its rank shown ("You're #3 of 24"). This is the image from the brand cover and the screenshot agents will forward to their boss.
- If the agent is outside the top 8, show the top 7, a gap, then their row.
- Click a bar → that competitor's detail.

### 1d. Your next three fixes
The three highest-priority open fixes as compact cards: title, one-line evidence ("The 3 agents AI names most average 412 Google reviews; you have 86"), effort badge, and one button: **Start**. Link: "See all 9 fixes".

### 1e. What changed this week
A short feed, newest first, max 5 items, generated from scan diffs:
- "Perplexity named you for 'best letting agent in Fareham' for the first time"
- "Belvoir appeared in 6 answers — new competitor"
- "Fix resolved: AI crawlers are no longer blocked"
- "Dropped out of ChatGPT answers for 'who should I sell with in Southsea'"

This makes the weekly visit worth it: the agent sees movement, not a static report.

**Navigation:** collapse 7 tabs into 4 — **Overview · Answers · Competitors · Fixes**. Citations moves into Fixes (it's a source of fixes) and Answers; AI referrals becomes a section of Overview once the snippet is installed; Settings moves to the branch menu.

---

## 2. Show the evidence as a conversation

The raw answers are Privett's most persuasive asset. Render them like the chat the agent would see on their phone, not as a text dump.

- **Answer card:** engine name and mark (text label, no third-party logos unless licensed), the question as a user bubble, the answer as an AI bubble in `body`.
- **Highlight names inside the answer:** the agent's name with a Signal Lime underline/marker and bold `ink`; competitors bold `ink-muted`; cited sources as small numbered chips that open the URL.
- **Run strip:** "Named in 3 of 5 runs" with five dots (filled `brand` / empty `data-rival-soft`) so the variation is visible and explained.
- **Copy and share:** "Copy answer" and "Share" (public read-only link to that one answer) so an agent can send it to a colleague.
- Done when: an agent can screenshot one answer card and it makes sense to someone who's never seen Privett.

---

## 3. The question × engine grid

On the **Answers** tab, a heat grid: rows = tracked questions, columns = ChatGPT, Perplexity, Gemini, Claude, cells = mention rate (0–100%) in a single-hue Evergreen scale with the percentage printed in the cell. Grey `—` for not tracked on that plan.

- One glance shows exactly where they're missing (a pale column = a weak engine; a pale row = a question they lose everywhere).
- Click a cell → the answers behind it.
- Sort rows by visibility or by change since last week.
- Profound recently rebuilt its dashboard around customisable grids like this; for one agent with ~18 questions and 4 engines, a fixed grid is enough.

---

## 4. Scans as a live moment

A scan takes minutes. Waits over 10 seconds lose people's attention unless the interface keeps them oriented, so turn the wait into the most exciting part of the product, especially on the **free scan**.

- **Live progress panel:** four engine rows, each with a progress bar and count ("ChatGPT · 14 of 30"), plus a total ("41 of 162 answers").
- **Stream results in:** as answers are parsed, show a live ticker of names being found ("Perplexity named Hunters, Fox & Sons, **you**…"), with the agent's name lighting up in lime when it appears.
- **Honest time estimate** ("About 2 minutes left"), based on the measured average per answer.
- **Let them leave:** "We'll email you when it's done" with the email pre-filled. Return to a finished result, not a spinner.
- **Reveal:** when the scan completes, the overview fills in once, with the visibility number counting up from 0 a single time (respect reduced motion: show it instantly).
- Done when: no screen in the app ever shows only a spinner for more than one second.

---

## 5. Fast everywhere

Responses under 0.1s feel instant; under 1s keep people in flow. Aim for both.

- **Skeletons, not spinners,** for every card, chart and table, shaped exactly like the content they replace, so nothing shifts when data arrives.
- **Optimistic updates:** marking a fix Done / Dismissed, pinning or hiding a competitor, editing a question all update immediately, with an **Undo** toast for 5 seconds; roll back with an error toast if the server rejects it.
- **Read weekly rollups** for overview charts (already on the to-do list) and prefetch the other three tabs on hover.
- **Target:** tab switch under 300ms on a busy branch; first meaningful paint of the overview under 1s.
- Done when: clicking anything gives visible feedback within 100ms.

---

## 6. Empty, first-use and error states

Every empty screen gets: a value-led headline, one or two lines of explanation, **one** primary action. Never a blank table.

| Situation | Headline | Action |
|---|---|---|
| Branch added, first scan running | "Your first scan is running" + live progress panel | "Email me when it's ready" |
| No fixes open | "Nothing to fix right now" + what was checked | "View what we checked" |
| No AI referrals yet | "See visits from ChatGPT and Perplexity" | "Install the snippet" → then **Check installation** that turns green when the first event arrives |
| Filter returns nothing | "No answers match 'Claude · Lettings'" | "Clear filters" |
| Scan failed | "This week's scan didn't finish. Your data is safe." | "Retry scan" |
| Low sample | Value greyed, warn note "Low sample: based on 8 answers" | "Why?" popover |

Keep "no results" and "error" visually different: errors use the `warn` icon, empty states don't.

---

## 7. Fixes that feel satisfying to finish

- **Progress ring** at the top of Fixes: "4 of 9 done", Evergreen ring on a `data-rival-soft` track.
- **Mark as done** → the card collapses with a quick lime tick (under 200ms), moves to "Done — re-checked next scan".
- **Re-check result** badge after the next scan: "Resolved ✓" (`up`) or "Still present" (`warn`).
- **Drafts** in a `surface-sunken` code block with a **Copy** button that changes to "Copied" for 1.5s; JSON-LD validated before display, with a "Valid schema" badge.
- **Effort and impact** shown as words, not icons: "15 minutes · high impact".

---

## 8. Motion rules

Small, quick and purposeful. Add these as tokens in the codebase:

| Interaction | Duration | Easing |
|---|---|---|
| Button press | 120ms, `scale(0.97)` on `:active` | ease-out |
| Tooltip / popover | 150ms | ease-out, from `scale(0.96)` + opacity 0 |
| Dropdown / menu | 180ms | ease-out |
| Drawer / modal (e.g. answer detail) | 240ms in, 160ms out | `cubic-bezier(0.32, 0.72, 0, 1)` |
| List items appearing | stagger 40ms | ease-out |
| Colour / hover | 120ms | ease |

- Default ease-out: `cubic-bezier(0.23, 1, 0.32, 1)`. Never ease-in for UI.
- Animate only `transform` and `opacity`. No `transition: all`.
- Gate hover effects behind `@media (hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion`: remove movement, keep opacity fades.
- Don't animate charts on every visit; animate once on first load after a new scan.

---

## 9. Typography and number polish

- `font-variant-numeric: tabular-nums` on every number so columns line up and digits don't jitter as they change.
- Consistent formats everywhere: `62%`, `#2.4`, `+8 pts`, `−3`, "Tue 20 Oct", "2 days ago". One helper in `packages/core` used by every surface.
- Never render `NaN`, `null`, `undefined`, `0%` for "not measured" — always "—".
- Relative times with exact time on hover.
- Truncate long agency names with an ellipsis and full name on hover; never wrap a name across two lines in a table.

---

## 10. Navigation chrome

- **Quiet sidebar:** `ink-muted` icons and labels, active item `brand` with `brand-tint` background. No coloured icons.
- **Header bar:** branch switcher (left), period selector with "compare to previous period" (right), **Scan now** as the one primary button. Same header on every tab so actions never move.
- **Clickable everything:** click a competitor anywhere → filter the page by them (Plausible's filter-by-clicking model). Show active filters as removable chips.
- **Command palette (later):** ⌘K to jump to a branch, question or competitor and run "Scan now" or "Copy snippet". Worth it for Agency users with many branches; not needed for launch.

---

## 11. Beyond the app: report and email

Agents won't log in every week, so the report has to come to them.

- **Weekly email** after each scan: the headline sentence, the four numbers with deltas, the ranked bars as an image, and one fix with a "Start" button. Plain, branded, readable on a phone. Skip it if nothing changed and send "No change this week" monthly instead. One-click unsubscribe.
- **Share report:** a read-only public link and a one-page PDF of the overview, for the Monday meeting or the agency owner. Branded footer "Measured by Privett" — every shared report is marketing.
- **Milestone notifications** (sparingly): "ChatGPT named you for the first time", "You moved into the top 3 in Southsea".

---

## 12. Mobile

Agents are on the road. The overview must work on a phone:
- Metric cards 2 × 2, headline sentence first, ranked bars full width, fixes as a stacked list.
- Answer cards read like a chat on mobile already.
- The heat grid scrolls horizontally inside its card; the page never does.
- Tap targets at least 44px.

---

## Build order

| Priority | Element | Why first |
|---|---|---|
| **Before launch** | 1. One-screen overview (headline, cards, ranked bars, next fixes, what changed) + 4 tabs | It's what every agent sees first; the five-second test |
| | 4. Live scan progress (free scan first) | The free scan is the sales funnel |
| | 2. Answers as conversation | The proof that sells the product |
| | 5. Skeletons + optimistic updates | Removes every "is it broken?" moment |
| | 6. Empty and error states | First-use is currently the weakest screen |
| **Next** | 11. Weekly email + share report | Retention and word of mouth |
| | 3. Question × engine grid | Best diagnostic view |
| | 7. Fix progress and re-check badges | Makes the fix loop feel rewarding |
| | 8–9. Motion and number polish | Craft pass across the app |
| | 12. Mobile pass | |
| **Later** | Command palette, milestones | Power users, once there are many branches |

## Acceptance checklist

- [ ] Five-second test: three people outside the business can say their visibility and top fix after a five-second look.
- [ ] No spinner-only state lasts longer than one second anywhere.
- [ ] Every click gives feedback within 100ms.
- [ ] Every metric shows previous period, trend and sample size.
- [ ] The agent is the only coloured series on every chart.
- [ ] Every empty state has a headline, explanation and one action.
- [ ] Nothing shifts when data loads.
- [ ] All text passes contrast in light and dark (per the brand guide).
- [ ] Works at 375px wide with no horizontal page scroll.
- [ ] Reduced-motion mode tested.

---

## Sources

- [Linear: behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh) — quiet chrome, softer structure, density without overwhelm
- [925 Studios: Linear design breakdown](https://www.925studios.co/blog/linear-design-breakdown-saas-ui-2026) — optimistic updates, skeletons, keyboard, 4px grid
- [925 Studios: Stripe dashboard breakdown](https://www.925studios.co/blog/stripe-dashboard-design-breakdown) — few opinionated metrics, previous period beneath, monochrome sparklines
- [Profound: refreshed Answer Engine Insights](https://www.tryprofound.com/blog/go-from-insights-to-action-faster-with-the-refreshed-answer-engine-insights) — metric grids, trend sorting, click a point to view the answers behind it
- [Plausible: dashboard guided tour](https://plausible.io/docs/guided-tour) — one page, click to filter, period comparison
- [Aufait UX: good dashboard design](https://www.aufaitux.com/blog/good-dashboard-design/) — five-second test, 3–5 KPIs, context for every number
- [Jakob Nielsen: time scales of UX](https://jakobnielsenphd.substack.com/p/time-scale-ux?open=false) and [NN/g: 3 response time limits](https://www.nngroup.com/videos/3-response-time-limits-interaction-design/) — 0.1s, 1s, 10s
- [LogRocket: skeleton screens vs spinners](https://blog.logrocket.com/?p=186494)
- [Emil Kowalski: design engineering skill](https://tessl.io/registry/skills/github/emilkowalski/skill/emil-design-eng) — durations, easing curves, press feedback, reduced motion
- [SaaS UI: empty state examples](https://www.saasui.design/blog/saas-empty-state-examples)
- [SaaS UI: command palette patterns](https://www.saasui.design/blog/saas-search-command-palette-ux-patterns)
- [Userlist: report emails in SaaS](https://userlist.com/blog/report-emails-saas/)
