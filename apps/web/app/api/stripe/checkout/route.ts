import { NextResponse } from "next/server";
import { getPlans, type PlanId } from "@privett/core";
import { requireOrg } from "@/lib/auth";
import { countActiveBranches } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ctx = await requireOrg();
  const back = (q: string) => NextResponse.redirect(appUrl(`/settings/billing?${q}`), 303);
  if (ctx.role !== "owner") return back("error=owner");

  const form = await request.formData();
  const planId = String(form.get("plan_id") ?? "") as PlanId;
  const plan = getPlans()[planId];
  if (!plan || plan.id === "free" || !plan.stripePriceId) return back("error=plan");

  const branches = await countActiveBranches(ctx.org.id);
  const requested = Number(form.get("quantity") ?? 1);
  const quantity = plan.id === "pro"
    ? 1
    : Math.min(Math.max(Number.isFinite(requested) ? Math.floor(requested) : 1, branches, 1), plan.limits.maxBranches);

  const stripe = getStripe();
  let customerId = ctx.org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.user.email,
      name: ctx.org.name,
      metadata: { org_id: ctx.org.id },
    });
    customerId = customer.id;
    await getSupabaseAdminClient()
      .from("organisations")
      .update({ stripe_customer_id: customerId })
      .eq("id", ctx.org.id);
  }

  const metadata = { org_id: ctx.org.id, plan_id: plan.id };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: ctx.org.id,
    line_items: [{ price: plan.stripePriceId, quantity }],
    allow_promotion_codes: true,
    metadata,
    subscription_data: { metadata },
    success_url: appUrl("/settings/billing?checkout=success"),
    cancel_url: appUrl("/settings/billing?checkout=cancelled"),
  });
  if (!session.url) return back("error=stripe");
  return NextResponse.redirect(session.url, 303);
}
