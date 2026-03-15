import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_PATHS = ["/dashboard", "/chat", "/aura", "/analytics", "/schedules", "/settings", "/onboarding"];

// Routes only for non-authenticated users
const AUTH_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for token in cookie (set by client-side after login)
  const hasToken = request.cookies.get("aura_logged_in")?.value === "true";

  // Redirect authenticated users away from auth pages
  if (AUTH_PATHS.some((p) => pathname.startsWith(p)) && hasToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login
  if (PROTECTED_PATHS.some((p) => pathname.startsWith(p)) && !hasToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/aura/:path*",
    "/analytics/:path*",
    "/schedules/:path*",
    "/settings/:path*",
    "/login",
    "/onboarding/:path*",
  ],
};
