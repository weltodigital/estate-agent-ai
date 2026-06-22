import { cookies } from "next/headers";
import { createServerClient } from "@app/db/client";

export function getSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options?: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value, ...(options ?? {}) });
        } catch {
          // Thrown when called during a Server Component render (cookies can
          // only be set in a Server Action / Route Handler). Safe to ignore —
          // Supabase calls this on a token refresh, and the browser client
          // persists the refreshed session cookie instead.
        }
      },
      remove(name: string, options?: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value: "", ...(options ?? {}) });
        } catch {
          // See set(): ignored during Server Component renders.
        }
      },
    },
  );
}
