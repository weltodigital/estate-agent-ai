import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST() {
  const ctx = await requireOrg();
  if (ctx.role !== "owner" || !ctx.org.stripe_customer_id) {
    return NextResponse.redirect(appUrl("/settings/billing?error=portal"), 303);
  }
  const session = await getStripe().billingPortal.sessions.create({
    customer: ctx.org.stripe_customer_id,
    return_url: appUrl("/settings/billing"),
  });
  return NextResponse.redirect(session.url, 303);
}
