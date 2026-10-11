// One set of display formats for every surface (docs/ux-spec.md section 9).
// Anything not measured renders as "—", never 0, NaN, null or undefined.

export const MISSING = "—";

function ok(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** 62%, 4.5% (one decimal under 10%). */
export function fmtPct(v: number | null | undefined): string {
  if (!ok(v)) return MISSING;
  if (v > 0 && v < 10) return `${Math.round(v * 10) / 10}%`;
  return `${Math.round(v)}%`;
}

/** #2.4 */
export function fmtPos(v: number | null | undefined): string {
  return ok(v) ? `#${v.toFixed(1)}` : MISSING;
}

/** +8 pts, −3 pts, 0 pts. True minus sign. */
export function fmtPts(v: number | null | undefined, unit = " pts"): string {
  if (!ok(v)) return MISSING;
  // Round the magnitude so -1.25 and 1.25 round the same way.
  const r = (Math.sign(v) * Math.round(Math.abs(v) * 10)) / 10;
  const n = Math.abs(r) % 1 === 0 ? Math.abs(r).toFixed(0) : Math.abs(r).toFixed(1);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${n}${unit}`;
}

/** Plain number, or "—". */
export function fmtNum(v: number | null | undefined): string {
  return ok(v) ? new Intl.NumberFormat("en-GB").format(v) : MISSING;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/London" });
const exactFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

function parse(iso: string | Date | null | undefined): Date | null {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Tue 20 Oct" (UK time). */
export function fmtDate(iso: string | Date | null | undefined): string {
  const d = parse(iso);
  return d ? dateFmt.format(d).replace(",", "") : MISSING;
}

/** "Tue 20 Oct 2026, 08:14": for tooltips behind relative times. */
export function fmtExact(iso: string | Date | null | undefined): string {
  const d = parse(iso);
  return d ? exactFmt.format(d) : MISSING;
}

/** "just now", "5 minutes ago", "2 hours ago", "yesterday", "3 days ago", then the date. */
export function fmtRelative(iso: string | Date | null | undefined, now: Date = new Date()): string {
  const d = parse(iso);
  if (!d) return MISSING;
  const s = Math.round((now.getTime() - d.getTime()) / 1000);
  if (s < 0) return fmtDate(d);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.round(h / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return fmtDate(d);
}
