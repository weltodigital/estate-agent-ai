import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  // Already signed in: go straight where they were heading.
  if (!error && (await getUser().catch(() => null))) redirect(safeNext(next));
  return (
    <>
      <h1 className="text-title text-ink">Sign in or create an account</h1>
      <p className="mt-1 text-sm text-ink-muted">We'll email you a link. No password needed.</p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-down">
          That sign-in link didn't work. It may have expired, so please request a new one.
        </p>
      ) : null}
      <LoginForm next={safeNext(next)} />
    </>
  );
}
