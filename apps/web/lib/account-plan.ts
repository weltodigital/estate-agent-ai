export interface Membership {
  orgId: string;
  orgName: string;
  role: "owner" | "member";
  otherMembers: number;
  otherOwners: number;
}

/**
 * What deleting a user's account does to each organisation they belong to:
 * - the only member: the organisation is deleted with them;
 * - the last owner, with others still in it: blocked, so the organisation
 *   is never left with nobody able to manage billing or the team;
 * - otherwise: they simply leave.
 */
export function planAccountDeletion(memberships: Membership[]) {
  const deleteOrgs: string[] = [];
  const blockedBy: Membership[] = [];
  for (const m of memberships) {
    if (m.otherMembers === 0) deleteOrgs.push(m.orgId);
    else if (m.role === "owner" && m.otherOwners === 0) blockedBy.push(m);
  }
  return { deleteOrgs, blockedBy };
}
