import { NextResponse, type NextRequest } from "next/server";
import { nameFromHtml, robotsAllowsRoot } from "@/lib/site-name";

export const runtime = "nodejs";

const UA = "Mozilla/5.0 (compatible; PrivettBot/1.0; +https://www.useprivett.com/bot)";
const MAX_BYTES = 300_000;

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,text/plain" }, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    return new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, MAX_BYTES));
  } catch {
    return null;
  }
}

/** GET /api/site-name?url=example.co.uk → { name } (null when unknown). Never errors. */
export async function GET(req: NextRequest) {
  const none = () => NextResponse.json({ name: null }, { headers: { "cache-control": "no-store" } });
  const raw = req.nextUrl.searchParams.get("url")?.trim();
  if (!raw || raw.length > 300) return none();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return none();
  }
  // Public websites only.
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname)) return none();

  const robots = await fetchText(`${url.origin}/robots.txt`, 3000);
  if (!robotsAllowsRoot(robots && !/<html/i.test(robots) ? robots : null, "PrivettBot")) return none();
  const html = await fetchText(url.origin + "/", 5000);
  return NextResponse.json({ name: html ? nameFromHtml(html) : null }, { headers: { "cache-control": "no-store" } });
}
