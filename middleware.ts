import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/secure/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (pathname.startsWith("/secure/admin/login")) {
    if (await verifySessionCookieValue(token)) {
      const raw = request.nextUrl.searchParams.get("next") || "/secure/admin/vishakha";
      const dest =
        raw.startsWith("/") && !raw.startsWith("//")
          ? raw
          : "/secure/admin/vishakha";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (!(await verifySessionCookieValue(token))) {
    const login = new URL("/secure/admin/login", request.url);
    login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/secure/admin", "/secure/admin/:path*"],
};
