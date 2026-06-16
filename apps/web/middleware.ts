import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Host-aware routing. The marketing site and the product are one Next.js app
 * served on two domains:
 *   - useprivett.com / www.useprivett.com -> marketing
 *   - app.useprivett.com                  -> the product (incl. its auth flow)
 *
 * The product and its auth pages live ONLY on app.useprivett.com; the marketing
 * pages live ONLY on the apex. Cross-domain hits are redirected to the canonical
 * host so neither surface leaks onto the other (e.g. useprivett.com/dashboard ->
 * app.useprivett.com/dashboard).
 *
 * The split is only enforced on the live useprivett.com domain. localhost and
 * Vercel preview deploys (*.vercel.app) serve every route from a single host, so
 * local dev and PR previews keep working without a subdomain.
 */

// Path prefixes that belong on app.useprivett.com — the product and the auth
// flow you sign in through. Everything else is treated as a marketing path.
const APP_PREFIXES = [
  "/dashboard",
  "/properties",
  "/settings",
  "/login",
  "/signup",
  "/finish-setup",
  "/accept-invite",
];

function isAppPath(pathname: string): boolean {
  return APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // Only enforce the split on the production domain. localhost and *.vercel.app
  // serve marketing + product from one host, so leave those untouched.
  if (!host.endsWith("useprivett.com")) {
    return NextResponse.next();
  }

  const isAppHost = host.startsWith("app.");
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();

  if (isAppHost) {
    // On the app subdomain the root lands on the product, not a marketing page.
    if (pathname === "/") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    // A marketing path on the app host belongs on the apex.
    if (!isAppPath(pathname)) {
      url.host = "useprivett.com";
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }

  // Apex / www: the product + auth routes belong on the app subdomain.
  if (isAppPath(pathname)) {
    url.host = "app.useprivett.com";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Run on every navigable route, but skip Next internals and any path with a
  // file extension (static assets like icon.png, robots.txt, sitemap.xml).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
