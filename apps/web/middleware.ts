import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Host-aware routing. The marketing site and the product are one Next.js app
 * served on two domains:
 *   - useprivett.com / www.useprivett.com -> marketing
 *   - app.useprivett.com                  -> the product
 *
 * On the app subdomain the root should land on the product, not the marketing
 * landing page. /dashboard is auth-protected and bounces to /login when the
 * visitor isn't signed in, so it's the right target for both signed-in and
 * signed-out users. Only the root path is intercepted (see matcher), so every
 * other route is untouched.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const isAppHost = host.startsWith("app.");

  if (isAppHost && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
