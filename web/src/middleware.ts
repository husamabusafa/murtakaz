import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDemoUserById } from "@/lib/demo-users";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

const locales = ["en", "ar"];
const defaultLocale = "en";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  const locale = pathnameHasLocale ? pathname.split("/").filter(Boolean)[0] : defaultLocale;

  if (!pathnameHasLocale) {
    request.nextUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  const canonicalPath = pathname.replace(new RegExp(`^/${locale}`), "") || "/";
  if (canonicalPath.startsWith("/auth/")) return;
  if (canonicalPath === "/") return;
  if (
    canonicalPath === "/pricing" ||
    canonicalPath === "/faq" ||
    canonicalPath === "/about" ||
    canonicalPath === "/contact" ||
    canonicalPath === "/careers" ||
    canonicalPath === "/privacy" ||
    canonicalPath === "/terms"
  ) {
    return;
  }

  const userId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = getDemoUserById(userId);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (canonicalPath.startsWith("/admin") && user.role !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/overview`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return;
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, assets)
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
