import { describe, expect, it } from "vitest";
import { planAccountDeletion, type Membership } from "./account-plan";

const m = (o: Partial<Membership>): Membership => ({ orgId: "o", orgName: "Org", role: "owner", otherMembers: 0, otherOwners: 0, ...o });

describe("planAccountDeletion", () => {
  it("deletes an organisation the user is alone in", () => {
    expect(planAccountDeletion([m({ orgId: "a" })])).toEqual({ deleteOrgs: ["a"], blockedBy: [] });
  });

  it("blocks the last owner of an organisation others still use", () => {
    const solo = m({ orgId: "a", otherMembers: 2, otherOwners: 0 });
    expect(planAccountDeletion([solo]).blockedBy).toEqual([solo]);
  });

  it("lets an owner leave when another owner remains", () => {
    expect(planAccountDeletion([m({ otherMembers: 1, otherOwners: 1 })])).toEqual({ deleteOrgs: [], blockedBy: [] });
  });

  it("lets a member leave", () => {
    expect(planAccountDeletion([m({ role: "member", otherMembers: 1, otherOwners: 1 })])).toEqual({ deleteOrgs: [], blockedBy: [] });
  });
});
