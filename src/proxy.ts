import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, sessionCookie } from "@/lib/auth/session";

/**
 * Middleware — protects /check, /history, and /api/fact-check routes.
 * Unauthenticated users are redirected to /login.
 * Public routes: /, /login, /api/auth/*, /icon.
 */
const PROTECTED_ROUTES = ["/check", "/history"];
const PROTECTED_API = ["/api/fact-check"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if route is protected
  const isProtectedPage = PROTECTED_ROUTES.some((p) => pathname.startsWith(p));
  const isProtectedApi = PROTECTED_API.some((p) => pathname.startsWith(p));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  // Verify session
  const token = req.cookies.get(sessionCookie.name)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (session) {
    return NextResponse.next();
  }

  // API routes get 401, pages get redirected to login
  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/check/:path*", "/history/:path*", "/api/fact-check/:path*"],
};
