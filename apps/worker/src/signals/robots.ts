// robots.txt parsing, just enough to answer: is this AI crawler blocked from
// the whole site? A bot uses the most specific group naming it, else "*".

export interface RobotsGroup {
  agents: string[];
  rules: { type: "allow" | "disallow"; path: string }[];
}

export function parseRobots(txt: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      // Consecutive user-agent lines share one group.
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      current.rules.push({ type: key, path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

/** Bots fully disallowed (Disallow: / without an overriding Allow: /), with the rule that does it. */
export function blockedAiBots(txt: string, bots: string[]): { bot: string; rule: string }[] {
  const groups = parseRobots(txt);
  const out: { bot: string; rule: string }[] = [];
  for (const bot of bots) {
    const b = bot.toLowerCase();
    const specific = groups.filter((g) => g.agents.includes(b));
    const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
    const rules = applicable.flatMap((g) => g.rules);
    const blocksRoot = rules.some((r) => r.type === "disallow" && (r.path === "/" || r.path === "/*"));
    const allowsRoot = rules.some((r) => r.type === "allow" && (r.path === "/" || r.path === "/*"));
    if (blocksRoot && !allowsRoot) {
      const agent = specific.length ? bot : "*";
      out.push({ bot, rule: `User-agent: ${agent} / Disallow: /` });
    }
  }
  return out;
}

function ruleRegex(path: string): RegExp {
  // robots.txt patterns: prefix match, "*" wildcard, "$" end anchor.
  const anchored = path.endsWith("$");
  const body = (anchored ? path.slice(0, -1) : path)
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

/**
 * Whether `agent` may fetch `path` under this robots.txt: the most specific
 * group naming the agent (else "*"), longest matching rule wins, Allow wins
 * ties. No robots.txt or no matching rule means allowed.
 */
export function isPathAllowed(txt: string | null, agent: string, path: string): boolean {
  if (!txt) return true;
  const groups = parseRobots(txt);
  const a = agent.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((x) => x !== "*" && a.includes(x)));
  const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  let best: { type: "allow" | "disallow"; len: number } | null = null;
  for (const r of applicable.flatMap((g) => g.rules)) {
    if (!r.path) continue; // "Disallow:" with no path allows everything
    if (!ruleRegex(r.path).test(path)) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && r.type === "allow")) best = { type: r.type, len };
  }
  return best?.type !== "disallow";
}
