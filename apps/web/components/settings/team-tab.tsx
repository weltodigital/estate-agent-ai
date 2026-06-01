"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { USER_ROLES, type UserRole } from "@app/shared/constants";
import type {
  CreateInviteRequest,
  CreateInviteResponse,
  Invite,
  UpdateUserRequest,
  User,
  UsersListResponse,
} from "@app/shared/schemas";
import { Button, Input, Label } from "@app/ui";
import { invitesApi, usersApi } from "@/lib/queries";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  agent: "Agent",
  viewer: "Viewer",
};

export function TeamTab() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery<UsersListResponse>({
    queryKey: ["users"],
    queryFn: usersApi.list,
  });
  const invitesQuery = useQuery<{ items: Invite[] }>({
    queryKey: ["invites"],
    queryFn: invitesApi.list,
  });

  const updateRole = useMutation<User, Error, { id: string; payload: UpdateUserRequest }>({
    mutationFn: ({ id, payload }) => usersApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
  const removeUser = useMutation<null, Error, string>({
    mutationFn: (id) => usersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("agent");
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);

  const createInvite = useMutation<CreateInviteResponse, Error, CreateInviteRequest>({
    mutationFn: invitesApi.create,
    onSuccess: (res) => {
      setLatestInviteUrl(res.invite_url);
      setInviteEmail("");
      setInviteName("");
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <header className="mb-3">
          <h2 className="text-lg font-semibold">Invite a team member</h2>
          <p className="text-xs text-slate-500">
            Admins only. They&apos;ll set their own password via the invite link.
          </p>
        </header>
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_10rem_8rem]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!inviteEmail) return;
            createInvite.mutate({
              email: inviteEmail,
              full_name: inviteName || undefined,
              role: inviteRole,
              branch_id: null,
            });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="invite_email">Email</Label>
            <Input
              id="invite_email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite_name">Name (optional)</Label>
            <Input
              id="invite_name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invite_role">Role</Label>
            <select
              id="invite_role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={createInvite.isPending || !inviteEmail}>
              {createInvite.isPending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </form>
        {createInvite.isError ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {(createInvite.error as Error).message}
          </p>
        ) : null}
        {latestInviteUrl ? (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <p className="font-medium">Invite link</p>
            <p>Share this with your teammate. They&apos;ll be asked to set a password.</p>
            <code className="mt-1 block break-all rounded bg-white p-2 font-mono">
              {latestInviteUrl}
            </code>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Pending invites</h2>
        {invitesQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading invites…</p>
        ) : (invitesQuery.data?.items ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No pending invites.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {invitesQuery.data?.items.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-xs text-slate-500">
                    {ROLE_LABELS[invite.role]} · expires{" "}
                    {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
                      new Date(invite.expires_at),
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Team</h2>
        {usersQuery.isLoading ? (
          <p className="text-sm text-slate-500">Loading team…</p>
        ) : (usersQuery.data?.items ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No members yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {usersQuery.data?.items.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      updateRole.mutate({
                        id: user.id,
                        payload: { role: e.target.value as UserRole },
                      })
                    }
                    className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                    disabled={updateRole.isPending}
                  >
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Remove ${user.full_name}?`)) removeUser.mutate(user.id);
                    }}
                    disabled={removeUser.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {updateRole.isError || removeUser.isError ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {((updateRole.error ?? removeUser.error) as Error)?.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
