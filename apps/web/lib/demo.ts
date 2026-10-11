// The public demo agency (/sample-report). Invented agency, example data.
// The id is fixed by apps/worker/scripts/seed-demo.ts; NEXT_PUBLIC_DEMO_BRANCH_ID
// can override it if the demo is ever re-seeded under a new id.
export const DEMO_BRANCH_ID = process.env.NEXT_PUBLIC_DEMO_BRANCH_ID || "311b454f-066d-4307-81a5-3d30b659aee7";

/** Request header set by middleware (and only by middleware) on demo pages. */
export const DEMO_HEADER = "x-privett-demo";

export function isDemoPath(pathname: string): boolean {
  const base = `/branches/${DEMO_BRANCH_ID}`;
  return pathname === base || pathname.startsWith(`${base}/`);
}
