import type { SubscriptionTier, UsageEventType } from "@app/shared/constants";
import { TIER_LIMITS } from "@app/shared/constants";
import { AppError } from "../errors.js";
import { loadEnv } from "../env.js";
import { getServiceClient } from "../integrations/supabase.js";

function compedEmails(): string[] {
  return (loadEnv().COMPED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Whether an agency is comped (unlimited usage) — true if any of its members'
 * emails is in COMPED_EMAILS. For internal accounts: bypasses quota entirely,
 * independent of subscription tier, trial, or payment.
 */
async function isCompedAgency(
  supabase: ReturnType<typeof getServiceClient>,
  agencyId: string,
): Promise<boolean> {
  const allowed = compedEmails();
  if (allowed.length === 0) return false;
  const { data } = await supabase.from("users").select("email").eq("agency_id", agencyId);
  return ((data as Array<{ email: string }> | null) ?? []).some((member) =>
    allowed.includes(member.email.toLowerCase()),
  );
}

/**
 * Hard quota enforcement. Called before recording a billable usage_event
 * (or queuing the work that will record one). Throws AppError 402 when the
 * agency has hit the tier's monthly limit.
 *
 * Service-role: needs to read across the agency's events independent of who
 * happens to be calling. Counts only events from the current calendar-month
 * boundary — same window the UI shows in the Billing tab.
 */
export async function assertWithinQuota(args: {
  agencyId: string;
  eventType: UsageEventType;
  units?: number;
}): Promise<void> {
  const units = args.units ?? 1;
  const supabase = getServiceClient();

  // Comped (internal) agencies get unlimited usage, regardless of tier/trial.
  if (await isCompedAgency(supabase, args.agencyId)) return;

  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("subscription_tier")
    .eq("id", args.agencyId)
    .maybeSingle<{ subscription_tier: SubscriptionTier }>();
  if (agencyError || !agency) {
    // If we can't determine the tier, fail open — better than blocking valid
    // work on a transient DB hiccup. The error path is logged elsewhere.
    return;
  }

  const limit = TIER_LIMITS[agency.subscription_tier][args.eventType];
  if (limit <= 0) {
    throw new AppError({
      status: 402,
      code: "tier_disallows",
      message: "This feature isn't available on your plan.",
    });
  }

  const periodStart = startOfMonth();
  const { data, error } = await supabase
    .from("usage_events")
    .select("units_consumed")
    .eq("agency_id", args.agencyId)
    .eq("event_type", args.eventType)
    .gte("created_at", periodStart.toISOString());
  if (error) {
    return; // fail-open on infra errors
  }
  const used = (data ?? []).reduce(
    (sum, row) => sum + ((row.units_consumed as number | undefined) ?? 0),
    0,
  );

  if (used + units > limit) {
    throw new AppError({
      status: 402,
      code: "quota_exceeded",
      message: `You've used your ${args.eventType.replace(/_/g, " ")} allowance for this month. Upgrade to keep going.`,
      details: { used, limit, tier: agency.subscription_tier },
    });
  }
}

function startOfMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
