/**
 * Billing service. Stub.
 *
 * TODO(phase-1/8): Wire to Stripe Subscriptions + Customer Portal.
 *   - createTrialSubscription(agencyId): starts a 7-day trial on starter tier
 *   - createCheckoutSession(agencyId, tier): hosted checkout
 *   - createPortalSession(agencyId): hosted customer portal
 *   - syncFromWebhook(event): updates agency.subscription_tier / stripe_*
 */

export async function createTrialSubscription(_agencyId: string): Promise<void> {
  // TODO(phase-1/8): Call Stripe createCustomer + createSubscription with
  // trial_period_days = 7 on the starter tier price. Persist the resulting
  // ids onto the agency row.
  return;
}
