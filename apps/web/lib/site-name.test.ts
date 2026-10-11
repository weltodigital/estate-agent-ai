import { describe, expect, it } from "vitest";
import { nameFromHtml, robotsAllowsRoot } from "./site-name";

describe("nameFromHtml", () => {
  it("prefers og:site_name", () => {
    expect(nameFromHtml('<meta property="og:site_name" content="Keats Fearn"><title>Home | Keats Fearn</title>')).toBe("Keats Fearn");
  });
  it("cleans titles", () => {
    expect(nameFromHtml("<title>Bernards Estate Agents | Estate Agents in Portsmouth</title>")).toBe("Bernards Estate Agents");
    expect(nameFromHtml("<title>Home | Lex Allan</title>")).toBe("Lex Allan");
    expect(nameFromHtml("<title>Fox &amp; Sons - Estate and Letting Agents</title>")).toBe("Fox & Sons");
    expect(nameFromHtml('<meta property="og:site_name" content="Bernards - The Estate Agents">')).toBe("Bernards");
    expect(nameFromHtml("<html></html>")).toBeNull();
  });
});

describe("robotsAllowsRoot", () => {
  it("obeys full blocks for the bot or everyone", () => {
    expect(robotsAllowsRoot("User-agent: *\nDisallow: /", "PrivettBot")).toBe(false);
    expect(robotsAllowsRoot("User-agent: PrivettBot\nDisallow: /\n\nUser-agent: *\nAllow: /", "PrivettBot")).toBe(false);
    expect(robotsAllowsRoot("User-agent: *\nDisallow: /admin", "PrivettBot")).toBe(true);
    expect(robotsAllowsRoot(null, "PrivettBot")).toBe(true);
  });
});
