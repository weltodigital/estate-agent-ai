import type { Tier } from "./pricing-data";

/**
 * Pricing card used on both the landing teaser and the /pricing page.
 * Cream surface, 0.5px Stone border, 12px radius. The Pro card is the only
 * exception to the 0.5px rule — 2px Terracotta border + "Most popular" badge.
 */
export function PricingCard({
  tier,
  showFeatures = false,
}: {
  tier: Tier;
  showFeatures?: boolean;
}) {
  return (
    <div className="relative flex h-full flex-col">
      {tier.popular ? (
        <span className="bg-brand-cream text-brand-terracotta absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-medium">
          Most popular
        </span>
      ) : null}
      <div
        className="bg-brand-cream flex h-full flex-col rounded-xl p-6"
        style={tier.popular ? { border: "2px solid #B5663D" } : { border: "0.5px solid #E4DFD0" }}
      >
        <h3 className="text-brand-ink font-serif text-2xl" style={{ fontWeight: 500 }}>
          {tier.name}
        </h3>
        <p className="mt-3 flex items-baseline gap-1">
          <span className="text-brand-ink text-4xl font-medium tabular-nums">£{tier.price}</span>
          <span className="text-brand-slate text-sm">/month</span>
        </p>
        <p className="text-brand-walnut mt-2 text-sm">{tier.listings}</p>

        {showFeatures ? (
          <ul className="mt-6 space-y-2.5">
            {tier.features.map((feature) => (
              <li key={feature} className="text-brand-walnut text-sm">
                {feature}
              </li>
            ))}
          </ul>
        ) : null}

        <a
          href="/signup"
          className="text-brand-terracotta hover:bg-brand-terracotta hover:text-brand-cream mt-8 inline-block rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors"
          style={{ border: "0.5px solid #B5663D", marginTop: "auto" }}
        >
          Choose this plan
        </a>
      </div>
    </div>
  );
}
