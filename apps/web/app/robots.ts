import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// AI crawlers are welcome: Privett tells agents not to block them, so we don't either.
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended"];
const PRIVATE = ["/api/", "/branches/", "/settings/", "/admin/", "/onboarding"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }, ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE }))],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
