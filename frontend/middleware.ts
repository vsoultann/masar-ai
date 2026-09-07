import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, locales } from "@/lib/i18n";

/**
 * Every page lives under /[locale]. This redirects paths that arrive without
 * one, choosing the locale from the Accept-Language header so an Arabic-speaking
 * visitor lands on the Arabic site without touching the toggle.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/").filter(Boolean)[0];
  if (first && isLocale(first)) return NextResponse.next();

  const header = request.headers.get("accept-language") ?? "";
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase())
    .find((code) => (locales as readonly string[]).includes(code));

  const locale = preferred ?? defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, the favicon and anything with a file extension.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
