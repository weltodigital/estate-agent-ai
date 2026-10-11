import { redirect } from "next/navigation";

// The Numbers view moved back onto the overview (UX spec 1b).
export default async function EvidenceRedirect({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  redirect(`/branches/${branchId}`);
}
