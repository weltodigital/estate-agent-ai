import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireBranch } from "@/lib/auth";
import { loadRecommendations } from "@/lib/data/branch-data";
import { COPY } from "@/lib/copy";
import { FixesBoard, SourcesLink } from "./fixes-board";

export const metadata = { title: "Fixes" };

// What each scan checks, shown when there's nothing to fix.
const CHECKED = [
  "Whether your robots.txt lets AI assistants read your site",
  "Your Google reviews against the agents AI names most",
  "Structured data that tells AI who and where you are",
  "Your presence on the sites AI cites for your area",
  "Pages for the neighbourhoods you track, a FAQ and a valuation page",
  "An llms.txt file",
];

export default async function FixesPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { branch } = await requireBranch(branchId);
  const recs = await loadRecommendations(branch.id);
  const open = recs.filter((r) => r.status === "todo" && r.verified_result !== "resolved").length;

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-ink-muted">
        What to change so AI has more reasons to name you, most important first. Open a fix for the steps and a draft to copy.
      </p>
      {!recs.length || (!open && !recs.some((r) => r.status === "done")) ? (
        <>
          <EmptyState
            title="Nothing to fix right now"
            action={
              <Link href={`/branches/${branch.id}/citations`} className={buttonClasses("secondary", "sm")}>
                View what we checked
              </Link>
            }
          >
            <p>After each scan we check:</p>
            <ul className="mt-2 space-y-1 text-left">
              {CHECKED.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          </EmptyState>
          {recs.length ? <FixesBoard branchId={branch.id} recs={recs} /> : <SourcesLink branchId={branch.id} />}
        </>
      ) : (
        <FixesBoard branchId={branch.id} recs={recs} />
      )}
      <p className="text-small text-ink-muted">{COPY.noPromise}</p>
    </div>
  );
}
