import { describe, expect, it } from "vitest";
import { blocksToText, heatStep, parseAnswer, runStrips, sourceDomains, truncateBlocks } from "./answers";

const opts = {
  youNames: ["Keats Fearn"],
  agentNames: ["Winkworth Farnham", "Winkworth", "Bourne"],
  citedUrls: ["https://www.rightmove.co.uk/agent/x", "https://getagent.co.uk/y"],
};

describe("parseAnswer", () => {
  it("highlights you and competitors, longest name first", () => {
    const [p] = parseAnswer("**Winkworth Farnham** is strong. Keats Fearn is family-run.", opts);
    expect(p!.inlines).toEqual([
      { kind: "agent", text: "Winkworth Farnham" },
      { kind: "text", text: " is strong. " },
      { kind: "you", text: "Keats Fearn" },
      { kind: "text", text: " is family-run." },
    ]);
  });

  it("is case-insensitive but keeps the answer's own casing, and respects word boundaries", () => {
    const [p] = parseAnswer("KEATS FEARN beat Bournemouth agents and bourne.", opts);
    const kinds = p!.inlines.map((x) => x.kind);
    expect(kinds).toEqual(["you", "text", "agent", "text"]);
    expect(p!.inlines[0]).toEqual({ kind: "you", text: "KEATS FEARN" });
  });

  it("turns markers into numbered chips with their URL, and inline source links into source chips", () => {
    const [p] = parseAnswer("Rated highly.[2] Top-ranked ([agentseeker.co.uk](https://agentseeker.co.uk/x)).", opts);
    expect(p!.inlines).toContainEqual({ kind: "cite", n: 2, url: "https://getagent.co.uk/y" });
    expect(p!.inlines).toContainEqual({ kind: "source", label: "agentseeker.co.uk", url: "https://agentseeker.co.uk/x" });
    const [q] = parseAnswer("See [5].", opts);
    expect(q!.inlines).toContainEqual({ kind: "cite", n: 5, url: null });
  });

  it("keeps paragraphs, bullets and headings", () => {
    const blocks = parseAnswer("## Top picks\n- **Bourne** — 4.7\n- Keats Fearn\n\nNotes\nmore notes", opts);
    expect(blocks.map((b) => b.kind)).toEqual(["h", "li", "li", "p"]);
    expect(blocksToText(blocks)).toBe("Top picks\n• Bourne — 4.7\n• Keats Fearn\nNotes more notes");
  });

  it("handles empty answers", () => {
    expect(parseAnswer(null, opts)).toEqual([]);
  });
});

describe("truncateBlocks", () => {
  it("cuts at a word boundary and reports truncation", () => {
    const blocks = parseAnswer(`${"word ".repeat(60)}\n\nsecond paragraph`, opts);
    const t = truncateBlocks(blocks, 100);
    expect(t.truncated).toBe(true);
    expect(blocksToText(t.blocks).endsWith("…")).toBe(true);
    expect(truncateBlocks(blocks, 10_000).truncated).toBe(false);
  });
});

describe("runStrips and helpers", () => {
  it("groups runs of the same question and engine within a scan", () => {
    const strips = runStrips([
      { scan_run_id: "s", prompt_text: "q", engine: "openai", run_index: 1, parse_status: "ok", mentioned: false },
      { scan_run_id: "s", prompt_text: "q", engine: "openai", run_index: 0, parse_status: "ok", mentioned: true },
      { scan_run_id: "s", prompt_text: "q", engine: "openai", run_index: 2, parse_status: "failed", mentioned: null },
    ]);
    expect(strips.get("s|openai|q")).toEqual([
      { runIndex: 0, named: true },
      { runIndex: 1, named: false },
      { runIndex: 2, named: null },
    ]);
  });

  it("dedupes source domains and buckets heat", () => {
    expect(sourceDomains(["https://www.a.co.uk/1", "https://a.co.uk/2", "bad", "https://b.com"]).map((s) => s.domain)).toEqual(["a.co.uk", "b.com"]);
    expect([null, 0, 10, 30, 50, 70, 90].map(heatStep)).toEqual([null, 0, 1, 2, 3, 4, 5]);
  });
});
