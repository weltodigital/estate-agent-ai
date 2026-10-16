import { ActionForm } from "@/components/platform/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { loadMemberships } from "@/lib/account";
import { planAccountDeletion } from "@/lib/account-plan";
import { requireOrg } from "@/lib/auth";
import { deleteAccountAction, deleteOrganisationAction } from "./actions";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const ctx = await requireOrg();
  const memberships = await loadMemberships(ctx.user.id);
  const plan = planAccountDeletion(memberships);
  const isOwner = ctx.role === "owner";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Account" description={`Signed in as ${ctx.user.email}.`} />

      {isOwner ? (
        <Card>
          <CardHeader
            title={`Delete ${ctx.org.name}`}
            description="Removes the organisation for everyone in it. This can't be undone."
          />
          <CardBody className="space-y-4 text-sm">
            <ul className="list-disc space-y-1 pl-5 text-ink-muted">
              <li>Any subscription is cancelled straight away, with no further charges.</li>
              <li>Every branch, scan, stored AI answer, fix and website visit record is deleted.</li>
              <li>Team members lose access. Their own accounts stay.</li>
              <li>Invoices stay in Stripe, because we have to keep accounting records.</li>
            </ul>
            <ActionForm action={deleteOrganisationAction} className="flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <Field label={`Type ${ctx.org.name} to confirm`}>
                  <Input name="confirm" required autoComplete="off" />
                </Field>
              </div>
              <Button type="submit" variant="danger">Delete organisation</Button>
            </ActionForm>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Delete your account" description="Removes your sign-in and your personal details. This can't be undone." />
        <CardBody className="space-y-4 text-sm">
          <ul className="list-disc space-y-1 pl-5 text-ink-muted">
            {memberships.map((m) => (
              <li key={m.orgId}>
                <span className="text-ink">{m.orgName}</span>
                {plan.deleteOrgs.includes(m.orgId)
                  ? ": you're the only member, so it's deleted too, and any subscription is cancelled."
                  : plan.blockedBy.includes(m)
                    ? ": you're the only owner. Make someone else an owner on the Team page first."
                    : ": you leave. Everyone else keeps their access."}
              </li>
            ))}
            <li>Free scans run with your email address are deleted.</li>
          </ul>
          {plan.blockedBy.length ? (
            <p role="alert" className="rounded-md bg-warn/10 p-3 text-warn">
              You can delete your account once every organisation you own has another owner, or no other members.
            </p>
          ) : (
            <ActionForm action={deleteAccountAction} className="flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <Field label="Type your email address to confirm">
                  <Input name="confirm" type="email" required autoComplete="off" />
                </Field>
              </div>
              <Button type="submit" variant="danger">Delete my account</Button>
            </ActionForm>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
