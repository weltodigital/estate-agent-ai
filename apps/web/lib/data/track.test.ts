import { describe, expect, it } from "vitest";
import { getReferrerSources } from "@privett/core";
import { cleanPath, parseTrackEvent } from "./track";

const sources = getReferrerSources({});
const key = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("parseTrackEvent", () => {
  it("accepts AI referrals", () => {
    expect(parseTrackEvent(JSON.stringify({ k: key, r: "chatgpt.com", u: "", p: "/sell?x=1" }), sources)).toEqual({
      key,
      source: "chatgpt",
      landingPath: "/sell",
    });
    expect(parseTrackEvent(JSON.stringify({ k: key, r: "", u: "perplexity", p: "/" }), sources)?.source).toBe("perplexity");
  });
  it("drops non-AI and malformed events", () => {
    expect(parseTrackEvent(JSON.stringify({ k: key, r: "www.google.com", p: "/" }), sources)).toBeNull();
    expect(parseTrackEvent(JSON.stringify({ k: "nope", r: "chatgpt.com" }), sources)).toBeNull();
    expect(parseTrackEvent("not json", sources)).toBeNull();
    expect(parseTrackEvent("x".repeat(5000), sources)).toBeNull();
  });
  it("cleans paths", () => {
    expect(cleanPath("valuations#top")).toBe("/valuations");
    expect(cleanPath("/" + "a".repeat(600)).length).toBe(512);
  });
});
