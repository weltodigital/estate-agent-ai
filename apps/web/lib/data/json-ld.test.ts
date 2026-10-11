import { describe, expect, it } from "vitest";
import { buildRealEstateAgentJsonLd } from "../../../../packages/core/src/rules/assets";
import { validateJsonLd } from "./json-ld";

describe("validateJsonLd", () => {
  it("accepts the drafts Privett generates", () => {
    const draft = buildRealEstateAgentJsonLd(
      { id: "b", name: "Keats Fearn", domain: "keatsfearn.co.uk", website: null, town: "Farnham", areas: ["Bentley"], postcode: "GU9 7PB" },
      null,
    );
    expect(validateJsonLd(draft)).toBe(true);
  });
  it("flags broken JSON", () => {
    expect(validateJsonLd('<script type="application/ld+json">{ "@type": "RealEstateAgent", }</script>')).toBe(false);
    expect(validateJsonLd("not json")).toBe(false);
  });
});
