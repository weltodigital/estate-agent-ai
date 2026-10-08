import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that need a signed-in user. Everything else is public (marketing,
// free scan, auth pages, tracking endpoint, Stripe webhook).
const PROTECTED = ["/dashboard", "/branches", "/settings", "/onboarding", "/admin"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  if (!user && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/|api/track|api/stripe/webhook|t\\.js|.*\\..*).*)"],
};
