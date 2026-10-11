import { NextResponse, type NextRequest } from "next/server";
import { DEMO_HEADER, isDemoPath } from "@/lib/demo";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that need a signed-in user. Everything else is public (marketing,
// free scan, auth pages, tracking endpoint, Stripe webhook). The demo
// agency's pages are public and read-only.
const PROTECTED = ["/dashboard", "/branches", "/settings", "/onboarding", "/admin"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const demo = isDemoPath(pathname);

  const { response: session, user } = await updateSession(request);
  if (!demo && !user && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Only middleware may mark a request as a demo view: strip any copy a
  // client sends, then set it for the demo path. Copied after the session
  // refresh so refreshed auth cookies reach the page.
  const headers = new Headers(request.headers);
  headers.delete(DEMO_HEADER);
  if (demo) headers.set(DEMO_HEADER, "1");
  const response = NextResponse.next({ request: { headers } });
  for (const c of session.cookies.getAll()) response.cookies.set(c);
  return response;
}

export const config = {
  matcher: ["/((?!_next/|api/track|api/stripe/webhook|t\\.js|.*\\..*).*)"],
};
