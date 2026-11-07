import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const ROLE_ROUTES: Record<string, string> = {
  "/admin": "admin",
  "/provider": "provider",
};

// Các route không yêu cầu vai trò "provider" (cho phép khách hàng truy cập đăng ký Thợ)
const EXCLUDED_PROVIDER_ROUTES = ["/provider/register"];

function redirectToSignIn(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const url = new URL("/auth/signin", request.url);
  url.searchParams.set("redirect", pathname + search);
  return NextResponse.redirect(url);
}

function requiredRole(pathname: string): string | undefined {
  if (
    EXCLUDED_PROVIDER_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  ) {
    return undefined;
  }

  const prefix = Object.keys(ROLE_ROUTES).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  return prefix ? ROLE_ROUTES[prefix] : undefined;
}

export async function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return redirectToSignIn(request);
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || session.user.isAnonymous) {
    return redirectToSignIn(request);
  }

  const role = requiredRole(request.nextUrl.pathname);

  if (role && session.user.role !== role) {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/provider/:path*"],
};
