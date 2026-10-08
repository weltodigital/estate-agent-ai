import { describe, expect, it } from "vitest";
import { classifyReferral } from "./referrers";

describe("classifyReferral", () => {
  it("detects referrers and utm tags", () => {
    expect(classifyReferral({ referrer: "https://chatgpt.com/" })).toBe("chatgpt");
    expect(classifyReferral({ referrer: "https://www.perplexity.ai/search?q=x" })).toBe("perplexity");
    expect(classifyReferral({ utmSource: "chatgpt.com" })).toBe("chatgpt");
    expect(classifyReferral({ referrer: "https://www.google.com/" })).toBeNull();
  });
});
