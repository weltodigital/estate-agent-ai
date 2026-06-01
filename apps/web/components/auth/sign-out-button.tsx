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
      className="rounded-md px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100"
    >
      Sign out
    </button>
  );
}
