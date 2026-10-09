"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function FreeScanForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const res = await fetch("/api/free-scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !json.token) throw new Error(json.error ?? "Something went wrong. Please try again.");
      router.push(`/free-scan/${json.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Agency name" hint="As clients know you.">
        <Input name="agency_name" required maxLength={120} />
      </Field>
      <Field label="Website">
        <Input name="website" required placeholder="www.example.co.uk" />
      </Field>
      <Field label="Town">
        <Input name="town" required maxLength={80} placeholder="Portsmouth" />
      </Field>
      <Field label="Work email" hint="We use it to link the results to your account if you sign up.">
        <Input type="email" name="email" required autoComplete="email" />
      </Field>
      {/* Honeypot, hidden from people. */}
      <div aria-hidden="true" className="absolute left-[-9999px]">
        <label>
          Company URL
          <input name="company_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Button type="submit" variant="accent" className="w-full" disabled={pending}>
        {pending ? "Starting your scan" : "Run my free scan"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
