# Infrastructure

Deployment topology and operational notes for `estate-agent-ai`. Phase 1 keeps
managed services everywhere — no Kubernetes, no custom infrastructure.

## Topology

```
            ┌────────────┐
            │  Cloudflare│       (DNS + WAF in front of everything)
            └─────┬──────┘
                  │
        ┌─────────┴──────────┐
        │                    │
   ┌────▼─────┐         ┌────▼──────┐
   │  Vercel  │  HTTPS  │  Railway  │
   │ apps/web │────────▶│ apps/api  │
   └──────────┘         └─────┬─────┘
                              │
                  ┌───────────┼────────────┐
                  │           │            │
            ┌─────▼────┐ ┌────▼─────┐ ┌────▼──────────┐
            │ Supabase │ │ Upstash  │ │ ai-orchestrator│
            │ (DB/Auth │ │ Redis    │ │ (Railway, py)  │
            │ /Storage)│ │ (BullMQ) │ │                │
            └──────────┘ └──────────┘ └────────────────┘

         Asset storage: Cloudflare R2 (signed URLs)
         CDN/transformations: Cloudinary
         Billing: Stripe (Subscriptions + Customer Portal)
         Email: Resend
```

## Where each piece runs

| Service              | Host         | Notes                                            |
| -------------------- | ------------ | ------------------------------------------------ |
| `apps/web`           | Vercel       | Next.js 14 App Router, build via Turbo           |
| `apps/api` (server)  | Railway      | Fastify; one service                             |
| `apps/api` (worker)  | Railway      | Same image, `pnpm start:worker` as the command   |
| `services/ai-orchestrator` | Railway | Python; image built from `services/ai-orchestrator/Dockerfile` |
| Supabase             | Supabase Cloud | EU region; daily backups enabled               |
| Redis (queue)        | Upstash      | EU region                                        |
| R2                   | Cloudflare   | Buckets: `eaai-uploads`, `eaai-outputs`          |
| Cloudinary           | Cloudinary   | One product environment                          |
| Stripe               | Stripe       | Live + test                                      |
| Email                | Resend       | Verified sending domain                          |
| DNS / WAF            | Cloudflare   | Proxy on for the web + api hostnames             |

## R2 lifecycle rules

- `eaai-uploads/sketches/*` — TTL 30 days. Raw sketches are processed within
  minutes; the finalised SVG/PDF/PNG lives in `outputs/`.
- `eaai-uploads/originals/*` — TTL 90 days for the agent's original photo
  uploads that haven't been finalised onto a property.
- `eaai-outputs/*` — no TTL.

## Runbook (placeholder)

- **API down** — check Railway → roll back to last green build. Logs in
  Logflare. Health check at `/healthz`.
- **AI orchestrator down** — same; Claude / Replicate outages cascade; flip the
  per-feature flag in `apps/api` env to show "AI features paused" banner.
- **Stripe webhook failing** — replay from the Stripe dashboard once the bug is
  fixed. `stripe_processed_events` table dedupes.
- **Floor-plan parses failing** — switch `CLAUDE_VISION_MODEL` to a known-good
  pin; investigate prompt drift.
- **DB at quota** — Supabase autoscaling is on; alarms fire at 80%. Largest
  table is `property_photos` (image blob URLs only — no binary data in DB).

Fuller on-call runbook lands in phase-1/10 (Production hardening).
