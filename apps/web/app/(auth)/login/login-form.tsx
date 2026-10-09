"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  async function google() {
    await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
  }

  if (status === "sent") {
    return (
      <p className="mt-6 rounded-md bg-surface-sunken p-4 text-sm text-ink-muted">
        Check your inbox. We've sent a sign-in link to <span className="font-medium text-ink">{email}</span>.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={sendLink} className="space-y-3">
        <Field label="Work email">
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={status === "sending"}>
          {status === "sending" ? "Sending link" : "Email me a sign-in link"}
        </Button>
        {status === "error" && message ? <p className="text-sm text-down">{message}</p> : null}
      </form>
      <div className="flex items-center gap-3 text-small text-ink-muted">
        <span className="h-px flex-1 bg-rival-soft" /> or <span className="h-px flex-1 bg-rival-soft" />
      </div>
      <Button type="button" variant="secondary" className="w-full" onClick={google}>
        Continue with Google
      </Button>
    </div>
  );
}
