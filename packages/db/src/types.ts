// AUTO-GENERATED. Do not edit by hand.
// Regenerate with `pnpm db:types`.
//
// The first migration has not yet been applied to your local Supabase, so this
// file ships with a minimal stub that lets the rest of the monorepo typecheck.
// After running `supabase start` and `pnpm db:migrate`, run `pnpm db:types` to
// replace this stub with the real schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
