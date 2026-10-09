import type { ReactNode } from "react";
import { BranchTabs } from "@/components/app/branch-tabs";
import { requireBranch } from "@/lib/auth";

export default async function BranchLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const { branch } = await requireBranch(branchId);
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-sm text-ink-muted">
        {branch.town}
        {branch.areas.length ? ` · ${branch.areas.join(", ")}` : ""}
      </p>
      <h1 className="mb-4 text-title text-ink">{branch.name}</h1>
      <BranchTabs branchId={branch.id} />
      {children}
    </div>
  );
}
