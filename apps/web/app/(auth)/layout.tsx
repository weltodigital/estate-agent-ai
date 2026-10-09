import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" aria-label="Privett home" className="mb-8">
        <Wordmark size={28} />
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-brand-stone bg-white p-6 shadow-card">{children}</div>
    </div>
  );
}
