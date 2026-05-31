# @app/ui — Shared shadcn/ui components
Supplements root CLAUDE.md.

- shadcn/ui primitives only. No app-specific composite components.
- Components are unstyled w.r.t. agency branding — use CSS custom properties (`--brand-primary`, `--brand-secondary`) so the host app can theme per-agency.
- Re-export everything from `src/index.ts`.
