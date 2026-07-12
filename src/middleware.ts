import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/authEdge";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow the login page and its API route through.
  if (pathname === "/login" || pathname.startsWith("/api/auth/login")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET ?? "";
  const ok = token ? await verifyToken(token, secret) : false;

  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except static assets and the login page itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
