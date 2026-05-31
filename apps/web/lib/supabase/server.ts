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
        cookieStore.set({ name, value, ...(options ?? {}) });
      },
      remove(name: string, options?: Record<string, unknown>) {
        cookieStore.set({ name, value: "", ...(options ?? {}) });
      },
    },
  );
}
