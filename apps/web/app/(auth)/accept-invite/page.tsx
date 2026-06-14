import { Suspense } from "react";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";

export const metadata = {
  title: "Accept invite",
};

export default function AcceptInvitePage() {
  return (
    <section className="border-brand-stone bg-brand-cream space-y-4 rounded-lg border p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Join your team</h1>
        <p className="text-sm text-slate-500">Set up your account to start managing properties.</p>
      </header>
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <AcceptInviteForm />
      </Suspense>
    </section>
  );
}
