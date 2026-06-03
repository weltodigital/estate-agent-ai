import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="bg-brand-bone min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <a href="/" className="mb-8 text-center">
          <Wordmark size={24} />
        </a>
        {children}
      </div>
    </main>
  );
}
