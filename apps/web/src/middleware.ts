import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = [
  "/dashboard",
  "/chat",
  "/aura",
  "/analytics",
  "/schedules",
  "/settings",
  "/onboarding",
];

const AUTH_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.get("aura_logged_in")?.value === "true";

  if (AUTH_PATHS.some((p) => pathname.startsWith(p)) && hasToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

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
