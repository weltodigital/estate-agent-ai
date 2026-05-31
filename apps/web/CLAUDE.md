# @app/web — Next.js 14 frontend
Supplements root CLAUDE.md.

## Conventions
- App Router only. No `pages/` directory.
- Server Components by default. `"use client"` only when truly needed (interactivity, browser APIs, hooks).
- Data fetching: server-side via Supabase server client OR TanStack Query for client components calling the Fastify API. Never fetch from `apps/api` server-to-server using `fetch` without going through `lib/api.ts`.
- Forms: React Hook Form + Zod resolver. Import schemas from `@app/shared/schemas`.
- Styling: Tailwind utility classes + shadcn/ui primitives in `components/ui/`. No CSS modules. No inline styles except for dynamic agency brand colours via CSS custom properties.
- Loading + error: every route segment has `loading.tsx` and `error.tsx`.

## Folder conventions
- `app/` — routes
- `components/ui/` — shadcn primitives
- `components/` (root of components) — app-specific composite components
- `lib/` — clients, utilities, hooks
- `hooks/` — React hooks

## Image handling
- Upload directly to R2 from the browser via signed URLs from the API. Do not proxy through Next.js.
- Display images via Cloudinary URLs for transformation (resize, format, quality).
