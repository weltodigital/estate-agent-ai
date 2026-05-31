# @app/db — Supabase schema and types
Supplements root CLAUDE.md.

- `migrations/` — numbered SQL files, applied in order via `supabase db push`
- `src/types.ts` — generated, do not edit by hand. Run `pnpm db:types`.
- `src/client.ts` — typed Supabase client factory (`createServerClient`, `createBrowserClient`, `createServiceClient`)
- Every migration must include rollback notes in a comment header.
- RLS policy changes require a new migration; never edit an existing migration after it's been applied to a deployed environment.
