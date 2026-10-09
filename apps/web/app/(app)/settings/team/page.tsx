import { ActionForm } from "@/components/platform/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { requireOrg } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { appUrl, formatDate } from "@/lib/utils";
import { inviteMember, removeMember, revokeInvite } from "./actions";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await requireOrg();
  const supabase = await getSupabaseServerClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("organisation_members").select("user_id, role, created_at, profiles(email, full_name)").eq("org_id", ctx.org.id).order("created_at"),
    supabase.from("organisation_invites").select("id, email, role, token, created_at").eq("org_id", ctx.org.id).is("accepted_at", null).order("created_at"),
  ]);
  const isOwner = ctx.role === "owner";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Team" description={`Everyone here can see every branch in ${ctx.org.name}.`} />
      <Card>
        <CardHeader title="Members" />
        <CardBody className="divide-y divide-brand-stone p-0">
          {(members ?? []).map((m) => {
            const p = m.profiles as unknown as { email: string; full_name: string | null } | null;
            return (
              <div key={m.user_id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p?.full_name ?? p?.email}</p>
                  {p?.full_name ? <p className="truncate text-brand-slate">{p.email}</p> : null}
                </div>
                <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{m.role}</Badge>
                {isOwner && m.user_id !== ctx.user.id ? (
                  <form action={removeMember}>
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <Button variant="ghost" size="sm">Remove</Button>
                  </form>
                ) : null}
              </div>
            );
          })}
        </CardBody>
      </Card>

      {isOwner ? (
        <Card>
          <CardHeader title="Invite a colleague" description="They'll sign in with this email address to join." />
          <CardBody className="space-y-6">
            <ActionForm action={inviteMember} className="flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <Field label="Email">
                  <Input type="email" name="email" required />
                </Field>
              </div>
              <Select name="role" defaultValue="member" className="w-32" aria-label="Role">
                <option value="member">Member</option>
                <option value="owner">Owner</option>
              </Select>
              <Button type="submit">Create invite</Button>
            </ActionForm>
            {invites?.length ? (
              <div className="space-y-3">
                <h4 className="text-sm">Pending invites</h4>
                {invites.map((i) => (
                  <div key={i.id} className="rounded-md border border-brand-stone p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{i.email}</span>
                      <Badge>{i.role}</Badge>
                      <span className="text-brand-slate">{formatDate(i.created_at)}</span>
                      <form action={revokeInvite} className="ml-auto">
                        <input type="hidden" name="invite_id" value={i.id} />
                        <Button variant="ghost" size="sm">Revoke</Button>
                      </form>
                    </div>
                    <Input readOnly value={appUrl(`/accept-invite/${i.token}`)} className="mt-2 font-mono text-xs" aria-label="Invite link" />
                  </div>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
