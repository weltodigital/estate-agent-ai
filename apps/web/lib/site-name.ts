// Guess an agency's name from its homepage, to prefill the free scan form.
// Pure helpers are unit tested; the fetch lives in the API route.

const SUFFIX = /\s*[|·•:\-–—]\s*(estate|letting|lettings|property|properties|sales|homes|home|independent|award|uk|the |your |welcome|official).*$/i;

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** og:site_name if present, else the <title> with marketing suffixes removed. */
export function nameFromHtml(html: string): string | null {
  const og =
    html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)?.[1];
  const title = og ?? html.match(/<title[^>]*>([^<]{2,300})<\/title>/i)?.[1];
  if (!title) return null;
  let t = decode(title);
  // "Home | Bernards Estate Agents" -> take the part that isn't a generic page name.
  const parts = t.split(/\s+[|·•–—-]\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && /^(home|homepage|welcome)$/i.test(parts[0]!)) t = parts.slice(1).join(" | ");
  t = t.replace(SUFFIX, "").split(/\s+[|·•–—]\s+/)[0]!.trim();
  return t.length >= 2 ? t.slice(0, 120) : null;
}

/** Simple robots.txt check for "/" for a given agent (group for agent, else "*"). */
export function robotsAllowsRoot(robots: string | null, agent: string): boolean {
  if (!robots) return true;
  const groups: { agents: string[]; disallowRoot: boolean; allowRoot: boolean }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (k === "user-agent") {
      if (!cur || !lastAgent) groups.push((cur = { agents: [], disallowRoot: false, allowRoot: false }));
      cur.agents.push(v.toLowerCase());
      lastAgent = true;
    } else {
      lastAgent = false;
      if (!cur) continue;
      if (k === "disallow" && (v === "/" || v === "/*")) cur.disallowRoot = true;
      if (k === "allow" && (v === "/" || v === "/*")) cur.allowRoot = true;
    }
  }
  const a = agent.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((x) => x !== "*" && a.includes(x)));
  const use = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  return !use.some((g) => g.disallowRoot && !g.allowRoot);
}
