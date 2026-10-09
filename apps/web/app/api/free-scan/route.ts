import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPlans, getScanSettings } from "@privett/core";
import { createBranchWithPrompts, normaliseWebsite } from "@/lib/branches";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  agency_name: z.string().trim().min(2).max(120),
  website: z.string().trim().min(4).max(300),
  town: z.string().trim().min(2).max(80),
  // Honeypot: real people never see or fill this.
  company_url: z.string().max(0).optional().or(z.literal("")),
});

const DAY = 24 * 60 * 60 * 1000;
const since = (ms: number) => new Date(Date.now() - ms).toISOString();

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the details and try again." }, { status: 400 });
  }
  const input = parsed.data;
  if (input.company_url) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { domain } = normaliseWebsite(input.website);
  if (!domain || !domain.includes(".")) {
    return NextResponse.json({ error: "That website address doesn't look right." }, { status: 400 });
  }

  const settings = getScanSettings();
  const salt = process.env.IP_HASH_SALT ?? "";
  const ipHash = createHash("sha256").update(`${clientIp(req)}|${salt}`).digest("hex");
  const admin = getSupabaseAdminClient();

  const count = async (col: "email" | "domain" | "ip_hash" | null, value: string | null, windowMs: number) => {
    let q = admin.from("free_scans").select("id", { count: "exact", head: true }).gte("created_at", since(windowMs));
    if (col && value) q = q.eq(col, value);
    const { count: c } = await q;
    return c ?? 0;
  };
  const [byEmail, byDomain, byIp, global] = await Promise.all([
    count("email", input.email, DAY),
    count("domain", domain, 7 * DAY),
    count("ip_hash", ipHash, DAY),
    count(null, null, DAY),
  ]);
  if (global >= settings.freeScanGlobalPerDay) {
    return NextResponse.json({ error: "We've hit today's limit for free scans. Please try again tomorrow." }, { status: 429 });
  }
  if (byEmail >= settings.freeScanPerEmailPerDay || byIp >= settings.freeScanPerIpPerDay) {
    return NextResponse.json({ error: "You've already run a free scan today. Please try again tomorrow." }, { status: 429 });
  }
  if (byDomain >= settings.freeScanPerDomainPerWeek) {
    return NextResponse.json({ error: "This website had a free scan in the last week. Sign up to track it every week." }, { status: 429 });
  }

  const free = getPlans().free.limits;
  try {
    // Unclaimed organisation, claimed later when this email signs up.
    const { data: org, error: orgErr } = await admin
      .from("organisations")
      .insert({ name: input.agency_name, claimed: false })
      .select("id")
      .single();
    if (orgErr || !org) throw orgErr ?? new Error("org insert failed");

    const { branchId } = await createBranchWithPrompts(admin, {
      orgId: org.id,
      name: input.agency_name,
      aliases: [],
      website: input.website,
      town: input.town,
      areas: [],
      postcode: null,
      promptLimit: settings.freeScanPrompts,
      townOnly: true,
    });

    const { data: run, error: runErr } = await admin
      .from("scan_runs")
      .insert({
        org_id: org.id,
        branch_id: branchId,
        kind: "free",
        engines: free.engines,
        runs_per_prompt: 1,
        budget_usd: free.scanBudgetUsd,
      })
      .select("id")
      .single();
    if (runErr || !run) throw runErr ?? new Error("run insert failed");

    const { data: scan, error: scanErr } = await admin
      .from("free_scans")
      .insert({
        email: input.email,
        website: input.website,
        domain,
        town: input.town,
        agency_name: input.agency_name,
        ip_hash: ipHash,
        org_id: org.id,
        branch_id: branchId,
        scan_run_id: run.id,
      })
      .select("access_token")
      .single();
    if (scanErr || !scan) throw scanErr ?? new Error("free scan insert failed");

    return NextResponse.json({ token: scan.access_token });
  } catch (err) {
    console.error("free scan failed", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
