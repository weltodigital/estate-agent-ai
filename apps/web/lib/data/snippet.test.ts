import { describe, expect, it } from "vitest";
import { getReferrerSources } from "@privett/core";
import { buildSnippetJs, snippetTag } from "./snippet";

describe("snippet", () => {
  it("is small and embeds the configured sources", () => {
    const js = buildSnippetJs(getReferrerSources({}), "https://app.example.com/api/track");
    expect(js).toContain("perplexity.ai");
    expect(js).toContain("https://app.example.com/api/track");
    expect(js).not.toContain("document.cookie");
    expect(new TextEncoder().encode(js).length).toBeLessThan(1500);
    expect(() => new Function(js)).not.toThrow();
  });
  it("builds the install tag", () => {
    expect(snippetTag("https://x.com", "abc")).toBe('<script async src="https://x.com/t.js" data-key="abc"></script>');
  });
});
