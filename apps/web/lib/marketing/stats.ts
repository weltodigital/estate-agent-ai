import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** Below these, the "answers analysed" proof line stays hidden. */
const MIN_ANSWERS = 5000;
const MIN_TOWNS = 10;

/**
 * Live proof for the homepage: parsed AI answers stored, and distinct UK towns
 * they cover. Cached for an hour so the homepage stays static. Null until the
 * numbers are meaningful, or if the database can't be reached.
 */
export const getPublicStats = unstable_cache(
  async (): Promise<{ answers: number; towns: number } | null> => {
    try {
      const admin = getSupabaseAdminClient();
      const { count } = await admin.from("scan_results").select("id", { count: "exact", head: true }).eq("parse_status", "ok");
      const answers = count ?? 0;
      if (answers < MIN_ANSWERS) return null;
      const { data } = await admin.from("scan_runs").select("branches(town)").eq("status", "completed").not("branch_id", "is", null).limit(5000);
      const towns = new Set(
        (data ?? [])
          .map((r) => (r.branches as unknown as { town: string } | null)?.town?.trim().toLowerCase())
          .filter((t): t is string => !!t),
      ).size;
      return towns >= MIN_TOWNS ? { answers, towns } : null;
    } catch {
      return null;
    }
  },
  ["public-stats"],
  { revalidate: 3600 },
);
