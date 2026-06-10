import { Fragment } from "react";

/**
 * Shared layout for legal pages (Privacy, Terms). Matches the marketing
 * typography (serif headings, Walnut body). A block is either a paragraph
 * (string) or a bullet list (string[]).
 */
export type LegalBlock = string | string[];

export type LegalSection = {
  heading: string;
  blocks: LegalBlock[];
};

export function LegalDocument({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-brand-ink text-[44px]">{title}</h1>
        <p className="text-brand-slate mt-3 text-[13px]">Last updated: {lastUpdated}</p>
        <p className="text-brand-walnut mt-8 text-[17px] leading-[1.6]">{intro}</p>

        <div className="mt-12 space-y-10">
          {sections.map((section, i) => (
            <div key={section.heading}>
              <h2 className="text-brand-ink font-serif text-[24px]" style={{ fontWeight: 400 }}>
                {i + 1}. {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.blocks.map((block, j) => (
                  <Fragment key={j}>
                    {Array.isArray(block) ? (
                      <ul className="text-brand-walnut list-disc space-y-1.5 pl-5 text-[17px] leading-[1.6]">
                        {block.map((item, k) => (
                          <li key={k}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-brand-walnut text-[17px] leading-[1.6]">{block}</p>
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
