import { PricingCard } from "@/components/marketing/pricing-card";
import { TIERS, COMPARISON_ROWS } from "@/components/marketing/pricing-data";

export const metadata = { title: "Pricing" };

const FAQ = [
  {
    q: "Can I switch tiers?",
    a: "Anytime, in two clicks. We prorate the difference.",
  },
  {
    q: "What happens if I go over my allowance?",
    a: "We let you know before you hit it. Overages are charged at the per-unit rate listed above. No surprises.",
  },
  {
    q: "Is there a free trial?",
    a: "Seven days, no card required. You can use every feature on every tier.",
  },
  {
    q: "Do you do annual billing?",
    a: "Yes, 10% off on every tier. Ask us when you're ready.",
  },
  {
    q: "Can my whole agency use one account?",
    a: "Yes. Add as many team members as your tier allows. Agency tier is unlimited.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="px-6 py-20 text-center">
        <h1 className="text-brand-ink text-[44px]">Pricing</h1>
        <p className="text-brand-walnut mx-auto mt-4 max-w-xl text-[17px]">
          Honest, agent-friendly pricing. No setup fees. Cancel anytime.
        </p>
      </section>

      {/* Cards with full feature lists */}
      <section className="px-6">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <PricingCard key={tier.name} tier={tier} showFeatures />
          ))}
        </div>
      </section>

      {/* What's included comparison table */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-brand-ink mb-8 text-center text-[32px]">What&rsquo;s included</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: "0.5px solid #E4DFD0" }}>
                  <th className="text-brand-walnut py-3 pr-4 font-medium">&nbsp;</th>
                  {TIERS.map((tier) => (
                    <th key={tier.name} className="text-brand-ink px-4 py-3 font-medium">
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label} style={{ borderBottom: "0.5px solid #E4DFD0" }}>
                    <td className="text-brand-walnut py-3 pr-4">{row.label}</td>
                    {row.values.map((value, i) => (
                      <td key={i} className="text-brand-ink px-4 py-3 tabular-nums">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Q&A */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl space-y-8">
          {FAQ.map((item) => (
            <div key={item.q} className="grid gap-2 md:grid-cols-2 md:gap-10">
              <h3 className="text-brand-ink text-[20px]" style={{ fontWeight: 500 }}>
                {item.q}
              </h3>
              <p className="text-brand-walnut text-base leading-[1.6]">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
