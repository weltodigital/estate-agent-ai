import { describe, expect, it } from "vitest";
import { excerpt, plainText } from "./plain-text";

describe("plainText", () => {
  it("strips markdown and citation markers seen in live answers", () => {
    expect(plainText("**Winkworth Farnham** is a strong first choice.[2] **Keats Fearn** too.[3]")).toBe(
      "Winkworth Farnham is a strong first choice. Keats Fearn too.",
    );
    expect(plainText("Bourne — top-ranked ([agentseeker.co.uk](https://agentseeker.co.uk/x))")).toBe(
      "Bourne — top-ranked (agentseeker.co.uk)",
    );
    expect(plainText("- **Hunters** — 4.9/5")).toBe("• Hunters — 4.9/5");
  });
  it("cuts excerpts at a word boundary", () => {
    expect(excerpt("one two three four five", 12)).toBe("one two…");
  });
});
