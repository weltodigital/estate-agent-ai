import { PricingCard } from "@/components/marketing/pricing-card";
import { TIERS } from "@/components/marketing/pricing-data";

const PROOF_POINTS = [
  {
    word: "Stage",
    body: "Empty room photos turned into furnished interiors in five British styles. Choose Modern, Scandi, Traditional, Minimalist or Luxury.",
  },
  {
    word: "Sketch",
    body: "Photograph your rough floor plan. We turn it into a branded PDF in under a minute.",
  },
  {
    word: "Write",
    body: "Property descriptions that actually sound British. No 'stunning', no 'nestled', no 'boasting'.",
  },
];

const FEATURES = [
  {
    title: "AI virtual staging.",
    body: "Upload a photo of an empty room. Pick a style. Get three furnished variations in a minute. Tuned for UK interiors: John Lewis, not Restoration Hardware.",
  },
  {
    title: "Floor plans from a sketch.",
    body: "Sketch a layout on paper or an iPad. Photograph it. Privett produces a clean, branded floor plan you can drop straight into a brochure or onto a portal.",
  },
  {
    title: "Listing descriptions that sound human.",
    body: "AI-generated property descriptions tuned for the British market. Idiomatic, idiom-aware, jargon-free. Edit them in place or regenerate in a different tone.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="text-brand-slate text-xs uppercase" style={{ letterSpacing: "0.12em" }}>
            Property marketing software for UK agents
          </p>
          <h1 className="text-brand-ink mx-auto mt-6 text-[36px] leading-[1.05] md:text-[52px]">
            Marketing for property,
            <br />
            done properly.
          </h1>
          <p className="text-brand-walnut mx-auto mt-6 max-w-[520px] text-[17px]">
            AI-staged photos, branded floor plans from a sketch, and listing descriptions that read
            like a real person wrote them. Built for independent UK agents.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/signup"
              className="bg-brand-terracotta text-brand-cream rounded-lg px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            >
              Start free trial
            </a>
            <a
              href="#features"
              className="text-brand-hedge rounded-lg px-5 py-2.5 text-sm font-medium"
              style={{ border: "0.5px solid #4A453A" }}
            >
              See it in action
            </a>
          </div>
          <p className="text-brand-slate mt-4 text-xs">7 days free. No card needed.</p>
        </div>
      </section>

      {/* Three-up proof points */}
      <section className="bg-brand-hedge px-6 py-24">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-3">
          {PROOF_POINTS.map((point) => (
            <div key={point.word}>
              <p className="text-brand-bone font-serif text-[32px]" style={{ fontWeight: 400 }}>
                {point.word}
              </p>
              <p className="text-brand-sand mt-3 text-[13px] leading-relaxed">{point.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The honest story */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="text-brand-ink text-[36px]">Independent agents deserve better tools.</h2>
          <p className="text-brand-walnut mt-6 text-[17px] leading-[1.6]">
            Estate agents spend hours on listing marketing that should take minutes. Privett gives
            you the tools the big chains have built in-house, like virtual staging, branded floor
            plans, polished descriptions, without the cost or the wait. Upload your photos and
            sketch on Monday. Listing live by Tuesday.
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section id="features" className="px-6 py-12">
        <div className="mx-auto max-w-5xl space-y-20 py-12">
          {FEATURES.map((feature, index) => (
            <div key={feature.title} className="grid items-center gap-10 md:grid-cols-2">
              {/* TODO: replace with real product screenshot */}
              <div
                className={`bg-brand-sand flex aspect-[3/2] items-center justify-center rounded-xl ${
                  index % 2 === 1 ? "md:order-2" : ""
                }`}
              >
                <span className="text-brand-walnut text-sm">preview</span>
              </div>
              <div className={index % 2 === 1 ? "md:order-1" : ""}>
                <h3 className="text-brand-ink text-[28px]">{feature.title}</h3>
                <p className="text-brand-walnut mt-4 text-base leading-[1.6]">{feature.body}</p>
                <a
                  href="/pricing"
                  className="text-brand-terracotta mt-4 inline-block text-sm font-medium"
                >
                  Learn more →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-brand-ink text-center text-[36px]">
            Pricing that scales with your branch
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
