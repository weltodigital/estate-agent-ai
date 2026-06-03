export const metadata = { title: "About" };

const SECTIONS = [
  {
    heading: "Built for independent agents.",
    body: "The big chains have entire marketing teams behind every listing. Independent agents don't — but their clients still expect the same quality of presentation. Privett closes that gap with software.",
  },
  {
    heading: "Made in the UK, for UK property.",
    body: "Our AI is tuned for British interiors, British vocabulary, and British market conventions. Floor plans use square metres. Descriptions say 'lounge'. EPC ratings are first-class.",
  },
  {
    heading: "Honest pricing, honest software.",
    body: "No setup fees. No surprise charges. No hidden long-term contracts. Cancel anytime. We tell you what something costs before you spend it.",
  },
];

export default function AboutPage() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-brand-ink text-[44px]">Why Privett</h1>
        <div className="mt-12 space-y-12">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-brand-ink font-serif text-[24px]" style={{ fontWeight: 400 }}>
                {section.heading}
              </h2>
              <p className="text-brand-walnut mt-3 text-[17px] leading-[1.6]">{section.body}</p>
            </div>
          ))}
        </div>
        <p className="text-brand-slate mt-16 text-[13px]">Founded in 2026. Based in the UK.</p>
      </div>
    </section>
  );
}
