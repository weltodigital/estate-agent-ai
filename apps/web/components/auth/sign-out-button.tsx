"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/login");
        router.refresh();
      }}
      className="text-brand-slate hover:bg-brand-stone/40 rounded-md px-3 py-2 text-left text-sm"
    >
      Sign out
    </button>
  );
}
