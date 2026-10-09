import { getReferrerSources } from "@privett/core";
import { buildSnippetJs } from "@/lib/data/snippet";
import { appUrl } from "@/lib/utils";

// Served at /t.js. Cached for an hour at the edge and in browsers.
export const revalidate = 3600;

export function GET() {
  return new Response(buildSnippetJs(getReferrerSources(), appUrl("/api/track")), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
