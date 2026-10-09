import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { acceptInvite } from "./actions";

export const metadata = { title: "Join your team" };

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/accept-invite/${token}`)}`);

  const admin = getSupabaseAdminClient();
  const { data: invite } = await admin
    .from("organisation_invites")
    .select("id, email, accepted_at, organisations(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.accepted_at) {
    return (
      <>
        <h1 className="text-title text-ink">Invite not found</h1>
        <p className="mt-2 text-sm text-ink-muted">This invite has already been used or no longer exists. Ask a colleague to send a new one.</p>
      </>
    );
  }
  const orgName = (invite.organisations as unknown as { name: string } | null)?.name ?? "your team";
  const emailMatches = invite.email.toLowerCase() === (user.email ?? "").toLowerCase();

  return (
    <>
      <h1 className="text-title text-ink">Join {orgName}</h1>
      {emailMatches ? (
        <form action={acceptInvite} className="mt-4">
          <input type="hidden" name="token" value={token} />
          <Button className="w-full">Accept invite</Button>
        </form>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">
          This invite was sent to {invite.email}, but you're signed in as {user.email}. Sign in with the invited address to accept it.
        </p>
      )}
    </>
  );
}
