// Operational alerts by email (Resend) to ALERT_EMAIL: scans that fail for
// good, paid scans stopped at their cost cap, engines or parsing failing in
// bulk, and daily AI spend over ALERT_DAILY_SPEND_USD. Each alert has a key
// and is sent at most once (ops_alerts). Without RESEND_API_KEY or
// ALERT_EMAIL it only logs.

import { db } from "./db";
import { env } from "./env";
import { errMessage, log } from "./log";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendAlert(key: string, subject: string, lines: string[]): Promise<boolean> {
  log.warn("alert", { key, subject, lines });
  if (!env.resendApiKey || !env.alertEmail) return false;
  try {
    // Claim the key first so two workers (or a restart) can't both send it.
    const { data, error } = await db().from("ops_alerts").insert({ key, subject }).select("key");
    if (error || !data?.length) return false; // already sent (unique violation) or table missing
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.resendApiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [env.alertEmail],
        subject: `[Privett alert] ${subject}`,
        text: [...lines, "", `Sent by the Privett worker (${env.workerId}).`].join("\n"),
        html: `<div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:#0E1A15">${lines.map((l) => `<p style="margin:0 0 8px 0">${esc(l)}</p>`).join("")}<p style="margin:16px 0 0 0;color:#56625C;font-size:12px">Sent by the Privett worker (${esc(env.workerId)}).</p></div>`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      await db().from("ops_alerts").delete().eq("key", key); // allow a retry later
      log.warn("alert email failed", { key, status: res.status, body: (await res.text()).slice(0, 300) });
      return false;
    }
    return true;
  } catch (err) {
    log.warn("alert failed", { key, err: errMessage(err) });
    return false;
  }
}

/** Engines (and parsing) failing in bulk within one run. Pure, tested. */
export function runHealthProblems(rows: { engine: string; parse_status: string; error: string | null }[]): string[] {
  const problems: string[] = [];
  const byEngine = new Map<string, { n: number; errors: number; sample: string | null }>();
  for (const r of rows) {
    const e = byEngine.get(r.engine) ?? { n: 0, errors: 0, sample: null };
    e.n++;
    if (r.parse_status === "engine_error") {
      e.errors++;
      e.sample ??= r.error;
    }
    byEngine.set(r.engine, e);
  }
  for (const [engine, e] of byEngine) {
    if (e.n >= 5 && e.errors / e.n >= 0.3) {
      problems.push(`${engine}: ${e.errors} of ${e.n} answers failed. First error: ${(e.sample ?? "unknown").slice(0, 300)}`);
    }
  }
  const answered = rows.filter((r) => r.parse_status !== "engine_error");
  const unparsed = answered.filter((r) => r.parse_status === "failed").length;
  if (answered.length >= 10 && unparsed / answered.length >= 0.2) {
    problems.push(`Parsing: ${unparsed} of ${answered.length} answers couldn't be read.`);
  }
  return problems;
}

/** After a run finishes: bulk engine or parse failures. */
export async function checkRunHealth(run: { id: string; kind: string }): Promise<void> {
  const { data } = await db().from("scan_results").select("engine, parse_status, error").eq("scan_run_id", run.id);
  const problems = runHealthProblems((data ?? []) as { engine: string; parse_status: string; error: string | null }[]);
  if (problems.length) {
    await sendAlert(`run-health:${run.id}`, `Problems in a ${run.kind} scan`, [`Scan run ${run.id} (${run.kind}) finished with problems:`, ...problems]);
  }
}

/** Once per day (UTC), if today's AI spend passes the threshold. */
export async function checkDailySpend(now = new Date()): Promise<void> {
  if (!env.alertDailySpendUsd) return;
  const day = now.toISOString().slice(0, 10);
  const { data } = await db().from("api_cost_log").select("cost_usd").gte("created_at", `${day}T00:00:00Z`).limit(100_000);
  const spent = (data ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
  if (spent >= env.alertDailySpendUsd) {
    await sendAlert(`spend:${day}`, `AI spend today is $${spent.toFixed(2)}`, [
      `AI API spend so far today (${day}, UTC) is $${spent.toFixed(2)}, over your alert threshold of $${env.alertDailySpendUsd}.`,
      "Check api_cost_log for which scans and engines it came from.",
    ]);
  }
}
