import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/** A full page outside the marketing and app layouts: not found, crashed. */
export function StandalonePage({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-surface px-4 py-8 md:px-8">
      <Link href="/" aria-label="Privett home" className="self-start">
        <Logo size={22} />
      </Link>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-16">
        <h1 className="text-title text-ink">{title}</h1>
        <div className="mt-2 text-ink-muted">{children}</div>
        <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
      </div>
    </main>
  );
}
