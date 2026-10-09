import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" aria-label="Privett home" className="mb-8">
        <Logo size={28} />
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-surface-raised p-6">{children}</div>
    </div>
  );
}
