import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractAnthropic } from "../src/engines/anthropic";
import { extractGemini } from "../src/engines/gemini";
import { extractOpenAI } from "../src/engines/openai";
import { extractPerplexity } from "../src/engines/perplexity";
import { runPrompt } from "../src/engines";

const openaiFixture = {
  output: [
    { type: "web_search_call", id: "ws_1", status: "completed" },
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: "Top agents in Portsmouth include Bernards and Fox & Sons.",
          annotations: [
            { type: "url_citation", url: "https://www.allagents.co.uk/portsmouth/" },
            { type: "url_citation", url: "https://bernardsea.co.uk/" },
            { type: "url_citation", url: "https://bernardsea.co.uk/" },
          ],
        },
      ],
    },
  ],
  usage: { input_tokens: 1200, output_tokens: 300 },
};

const perplexityFixture = {
  choices: [{ message: { content: "Consider Bernards or Fox & Sons." } }],
  citations: ["https://www.allagents.co.uk/portsmouth/"],
  search_results: [{ url: "https://bernardsea.co.uk/about" }, { url: "not a url" }],
  usage: { prompt_tokens: 20, completion_tokens: 200 },
};

const geminiFixture = {
  candidates: [
    {
      content: { parts: [{ text: "Bernards is well reviewed. " }, { text: "Fox & Sons is another option." }] },
      groundingMetadata: {
        webSearchQueries: ["best estate agent portsmouth"],
        groundingChunks: [
          { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc", title: "allagents.co.uk" } },
          { web: { uri: "https://bernardsea.co.uk/sales", title: "Bernards" } },
          { web: { uri: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/def", title: "Some article title" } },
        ],
      },
    },
  ],
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 150 },
};

describe("engine extraction", () => {
  it("openai: text, de-duplicated url citations, search calls", () => {
    const r = extractOpenAI(openaiFixture);
    expect(r.text).toContain("Bernards");
    expect(r.urls).toEqual(["https://www.allagents.co.uk/portsmouth/", "https://bernardsea.co.uk/"]);
    expect(r.searchCalls).toBe(1);
  });

  it("perplexity: citations and search_results, invalid urls dropped", () => {
    const r = extractPerplexity(perplexityFixture);
    expect(r.text).toBe("Consider Bernards or Fox & Sons.");
    expect(r.urls).toEqual(["https://www.allagents.co.uk/portsmouth/", "https://bernardsea.co.uk/about"]);
  });

  it("gemini: joins parts, resolves redirect chunks to their domain title", () => {
    const r = extractGemini(geminiFixture);
    expect(r.text).toBe("Bernards is well reviewed. Fox & Sons is another option.");
    expect(r.urls).toEqual(["https://allagents.co.uk/", "https://bernardsea.co.uk/sales"]);
    expect(r.grounded).toBe(true);
  });

  it("anthropic: prefers text citations, falls back to search results", () => {
    const cited = extractAnthropic([
      { type: "server_tool_use", id: "s1", name: "web_search", input: {} },
      {
        type: "web_search_tool_result",
        tool_use_id: "s1",
        content: [{ type: "web_search_result", url: "https://a.example.co.uk/", title: "A", encrypted_content: "x", page_age: null }],
      },
      {
        type: "text",
        text: "Bernards is popular.",
        citations: [{ type: "web_search_result_location", url: "https://bernardsea.co.uk/", title: "B", cited_text: "x", encrypted_index: "y" }],
      },
    ] as never);
    expect(cited.text).toBe("Bernards is popular.");
    expect(cited.urls).toEqual(["https://bernardsea.co.uk/"]);

    const uncited = extractAnthropic([
      {
        type: "web_search_tool_result",
        tool_use_id: "s1",
        content: [{ type: "web_search_result", url: "https://a.example.co.uk/", title: "A", encrypted_content: "x", page_age: null }],
      },
      { type: "text", text: "Answer.", citations: null },
    ] as never);
    expect(uncited.urls).toEqual(["https://a.example.co.uk/"]);
  });
});

describe("runPrompt (mocked fetch)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("OPENAI_API_KEY", "test");
    vi.stubEnv("PERPLEXITY_API_KEY", "test");
    vi.stubEnv("GEMINI_API_KEY", "test");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  it("openai: sends a GB-located web search request and costs the call", async () => {
    fetchMock.mockResolvedValueOnce(ok(openaiFixture));
    const a = await runPrompt("openai", { prompt: "best estate agent in Portsmouth", town: "Portsmouth" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(init.body);
    expect(body.input).toBe("best estate agent in Portsmouth");
    expect(body.tools[0].user_location).toMatchObject({ country: "GB", city: "Portsmouth" });
    expect(a.citedUrls).toHaveLength(2);
    expect(a.costUsd).toBeGreaterThan(0);
  });

  it("perplexity: retries a 429 then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("slow down", { status: 429, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(ok(perplexityFixture));
    const a = await runPrompt("perplexity", { prompt: "q", town: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(a.answerText).toContain("Bernards");
  });

  it("gemini: uses the google_search tool and fails on an empty answer", async () => {
    fetchMock.mockResolvedValueOnce(ok(geminiFixture));
    await runPrompt("gemini", { prompt: "q", town: null });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).tools).toEqual([{ google_search: {} }]);

    fetchMock.mockResolvedValueOnce(ok({ candidates: [] }));
    await expect(runPrompt("gemini", { prompt: "q", town: null })).rejects.toThrow(/no answer/);
  });

  it("does not retry a 400", async () => {
    fetchMock.mockResolvedValueOnce(new Response("bad request", { status: 400 }));
    await expect(runPrompt("openai", { prompt: "q", town: null })).rejects.toThrow(/HTTP 400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
