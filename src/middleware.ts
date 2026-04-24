import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/quien-soy", "/api", "/_next", "/favicon"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("alh_user")?.value;
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/quien-soy";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
