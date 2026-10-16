import { describe, expect, it } from "vitest";
import { renderPromptsForBranch, type PromptTemplate } from "./prompts";

const t = (id: string, template: string, uses_area: boolean, sort_order: number): PromptTemplate => ({
  id,
  template,
  intent_group: "selling",
  uses_area,
  sort_order,
});

describe("renderPromptsForBranch", () => {
  it("always asks about an area with its town, so same-named places elsewhere don't answer", () => {
    const texts = renderPromptsForBranch(
      [t("a", "best estate agent in {area}", true, 1), t("b", "most recommended estate agent in {area}, {town}", true, 2)],
      { town: "Portsmouth", areas: ["Southsea"] },
      10,
    ).map((p) => p.text);
    expect(texts).toEqual(["best estate agent in Southsea, Portsmouth", "most recommended estate agent in Southsea, Portsmouth"]);
  });

  it("keeps the bare area name for matching and area pages", () => {
    const [p] = renderPromptsForBranch([t("a", "best estate agent in {area}", true, 1)], { town: "Portsmouth", areas: ["Drayton"] }, 10);
    expect(p!.area).toBe("Drayton");
  });
});
