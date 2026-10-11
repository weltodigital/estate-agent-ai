"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/** Step 1: website and town. A plain GET form, so it works without JavaScript. */
export function FreeScanStepOne({ website = "", town = "" }: { website?: string; town?: string }) {
  return (
    <form action="/free-scan" method="get" className="space-y-4">
      <Field label="Your website">
        <Input name="website" required defaultValue={website} placeholder="www.youragency.co.uk" inputMode="url" autoComplete="url" />
      </Field>
      <Field label="Town">
        <Input name="town" required defaultValue={town} maxLength={80} placeholder="Southsea" />
      </Field>
      <Button type="submit" variant="primary" className="h-12 w-full">
        Run free scan
      </Button>
    </form>
  );
}

/** Step 2: agency name (prefilled from the website) and email, then start the scan. */
export function FreeScanStepTwo({ website, town, resultsByEmail }: { website: string; town: string; resultsByEmail: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [name, setName] = useState("");
  const [finding, setFinding] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/site-name?url=${encodeURIComponent(website)}`)
      .then((r) => (r.ok ? r.json() : { name: null }))
      .then((j: { name: string | null }) => {
        if (!cancelled && j.name) setName((n) => n || j.name!);
      })
      .catch(() => {})
      .finally(() => !cancelled && setFinding(false));
    return () => {
      cancelled = true;
    };
  }, [website]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSignIn(false);
    const body = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), website, town };
    try {
      const res = await fetch("/api/free-scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { token?: string; error?: string; signIn?: boolean };
      if (json.signIn) setSignIn(true);
      if (!res.ok || !json.token) throw new Error(json.error ?? "Something went wrong. Please try again.");
      router.push(`/free-scan/${json.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-small text-ink-muted">
        Scanning <span className="font-medium text-ink">{website}</span> in <span className="font-medium text-ink">{town}</span> ·{" "}
        <Link href={`/free-scan?edit=1&website=${encodeURIComponent(website)}&town=${encodeURIComponent(town)}`} className="text-brand hover:underline">
          Change
        </Link>
      </p>
      <Field label="Agency name" hint={finding ? "Finding your agency name…" : "As clients know you. Edit it if it isn't right."}>
        <Input name="agency_name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" />
      </Field>
      <Field
        label="Work email"
        hint={
          resultsByEmail
            ? "Why we ask: we email your results and limit free scans to one per agency."
            : "Why we ask: we use it to link your results to your account and limit free scans to one per agency."
        }
      >
        <Input type="email" name="email" required autoComplete="email" />
      </Field>
      {/* Honeypot, hidden from people. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label>
          Company URL
          <input name="company_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Button type="submit" variant="primary" className="h-12 w-full" disabled={pending}>
        {pending ? "Starting your scan" : "Start my free scan"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-down">
          {error}
          {signIn ? (
            <>
              {" "}
              <Link href="/login?next=/branches/new" className="font-medium text-brand underline underline-offset-2">
                Sign in
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}

/** Back-compat alias: step one of the free scan. */
export const FreeScanForm = FreeScanStepOne;
