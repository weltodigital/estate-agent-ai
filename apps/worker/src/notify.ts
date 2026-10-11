// Free-scan results email (Resend). Sent once per free scan when its run
// finishes, only if RESEND_API_KEY is set. Figures come from the same core
// functions as the results page, so the email and the page always agree.

import {
  BRANCH_KEY,
  computeSubjectMetrics,
  toMetricResponses,
  type AgentMentionRow,
  type ScanResultRow,
} from "@privett/core";
import { db } from "./db";
import { env } from "./env";
import { errMessage, log } from "./log";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "4 out of 10", never 0 for a non-zero rate (matches the results page). */
export function outOfTen(pct: number | null): number {
  if (pct === null || pct <= 0) return 0;
  return pct < 5 ? 1 : Math.round(pct / 10);
}

export function freeScanEmailHtml(o: { agency: string; town: string; outOf10: number; namedInstead: string[]; url: string }): string {
  const font = "font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;";
  const others = o.namedInstead.length
    ? `<p style="margin:16px 0 0 0;font-size:15px;line-height:22px;color:#0E1A15;">Named most often instead: ${o.namedInstead.map((n) => `<strong>${esc(n)}</strong>`).join(", ")}.</p>`
    : "";
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Your Privett free scan</title></head>
<body style="margin:0;padding:0;background:#F7F7F2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F2;"><tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #DCDDD3;border-radius:16px;">
<tr><td style="padding:32px 32px 0 32px;"><img src="https://www.useprivett.com/email/privett-mark.png" width="40" height="40" alt="Privett" style="display:block;border:0;"></td></tr>
<tr><td style="padding:24px 32px 0 32px;${font}color:#0E1A15;">
<p style="margin:0;font-size:13px;line-height:18px;color:#56625C;">Free scan · ${esc(o.town)}</p>
<h1 style="margin:8px 0 0 0;font-size:24px;line-height:30px;font-weight:600;letter-spacing:-0.3px;">AI named ${esc(o.agency)} in ${o.outOf10} out of 10 answers</h1>
${others}
</td></tr>
<tr><td style="padding:24px 32px 0 32px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#0F4C3A;border-radius:10px;">
<a href="${esc(o.url)}" style="display:inline-block;padding:12px 20px;${font}font-size:15px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;">See your results</a>
</td></tr></table></td></tr>
<tr><td style="padding:24px 32px 32px 32px;${font}font-size:13px;line-height:18px;color:#56625C;">
<p style="margin:0;">Your results also show your first fix and every answer behind these numbers.</p>
<p style="margin:16px 0 0 0;padding-top:16px;border-top:1px solid #DCDDD3;">You're getting this because you ran a free scan at useprivett.com. We report what AI assistants say; we can't promise how any assistant will answer.</p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function sendFreeScanEmail(runId: string): Promise<void> {
  if (!env.resendApiKey) return;
  try {
    // Claim first so two workers can never both send.
    const { data: claimed } = await db()
      .from("free_scans")
      .update({ emailed_at: new Date().toISOString() })
      .eq("scan_run_id", runId)
      .is("emailed_at", null)
      .select("id, email, agency_name, town, branch_id, access_token")
      .maybeSingle();
    if (!claimed) return;

    const { data: results } = await db()
      .from("scan_results")
      .select("id, engine, intent_group, created_at, prompt_text, parse_status")
      .eq("scan_run_id", runId);
    const ids = (results ?? []).map((r) => r.id as string);
    const { data: mentions } = ids.length
      ? await db()
          .from("agent_mentions")
          .select("scan_result_id, normalised_name, position, is_branch, matched_competitor_id, matched_league_agent_id, match_confidence, sentiment_score, descriptors")
          .in("scan_result_id", ids)
      : { data: [] };
    const responses = toMetricResponses((results ?? []) as ScanResultRow[], (mentions ?? []) as AgentMentionRow[]);
    const you = computeSubjectMetrics(responses, BRANCH_KEY);
    if (!you.responses) {
      // Nothing to report: release the claim so a retry can send later.
      await db().from("free_scans").update({ emailed_at: null }).eq("id", claimed.id);
      return;
    }
    const { data: comps } = await db().from("competitors").select("id, name").eq("branch_id", claimed.branch_id).neq("status", "hidden");
    const namedInstead = (comps ?? [])
      .map((c) => ({ name: c.name as string, n: computeSubjectMetrics(responses, c.id as string).mentions }))
      .filter((c) => c.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 3)
      .map((c) => c.name);

    const url = `${env.appUrl}/free-scan/${claimed.access_token}`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.resendApiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [claimed.email],
        subject: `Your Privett free scan: ${claimed.agency_name} in ${claimed.town}`,
        html: freeScanEmailHtml({ agency: claimed.agency_name, town: claimed.town, outOf10: outOfTen(you.visibility), namedInstead, url }),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      await db().from("free_scans").update({ emailed_at: null }).eq("id", claimed.id);
      log.warn("free scan email failed", { runId, status: res.status, body: (await res.text()).slice(0, 300) });
      return;
    }
    log.info("free scan email sent", { runId });
  } catch (err) {
    log.warn("free scan email error", { runId, err: errMessage(err) });
  }
}
