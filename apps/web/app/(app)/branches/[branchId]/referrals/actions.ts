"use server";

import { requireBranch } from "@/lib/auth";
import { loadLastReferral } from "@/lib/data/branch-data";

/** Has the tracking snippet sent anything yet? Returns the latest visit time. */
export async function checkInstallation(branchId: string): Promise<{ last: string | null }> {
  const { branch } = await requireBranch(branchId);
  return { last: await loadLastReferral(branch.id) };
}
