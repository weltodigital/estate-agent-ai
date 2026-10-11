import { redirect } from "next/navigation";
import { DEMO_BRANCH_ID } from "@/lib/demo";

// The public example report: the real dashboard, read only, for an invented
// agency (seeded by apps/worker/scripts/seed-demo.ts).
export default function SampleReportPage() {
  redirect(`/branches/${DEMO_BRANCH_ID}`);
}
