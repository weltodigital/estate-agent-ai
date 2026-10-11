"use server";

import { revalidatePath } from "next/cache";
import { requireBranch } from "@/lib/auth";
import { enqueueScan } from "@/lib/scans";

export type ScanNowState = { ok?: string; error?: string } | null;

/** "Scan now" from the branch header. Plan limits are checked by enqueueScan. */
export async function scanNow(_prev: ScanNowState, formData: FormData): Promise<ScanNowState> {
  const branchId = String(formData.get("branch_id") ?? "");
  const { org, branch } = await requireBranch(branchId);
  const res = await enqueueScan({ orgId: org.id, branchId: branch.id, kind: "manual" });
  if (!res.ok) return { error: res.error };
  revalidatePath(`/branches/${branch.id}`, "layout");
  return { ok: "Scan started. Results appear as the answers come in." };
}
