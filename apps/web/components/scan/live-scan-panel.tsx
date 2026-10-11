"use client";

// Live scan progress (UX spec section 4). Placeholder interface: the Live
// scans work fills this in. Shows per-engine progress, a ticker of names
// found, a time estimate, and calls router.refresh() when the run finishes.
export interface LiveScanPanelProps {
  /** Scan run to follow. */
  runId: string;
  /** Free-scan access token, for unauthenticated progress reads. */
  token?: string;
  /** The tracked agency's display name, highlighted when it's found. */
  agencyName: string;
}

export function LiveScanPanel({ agencyName }: LiveScanPanelProps) {
  return <p className="text-small text-ink-muted">Scanning for {agencyName}…</p>;
}
