import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <a href="/" className="mb-8 text-center text-sm font-semibold">
          Estate Agent AI
        </a>
        {children}
      </div>
    </main>
  );
}
