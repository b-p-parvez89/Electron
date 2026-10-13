import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/** Gate /admin pages (except login) behind a valid admin session. API routes enforce their own checks too. */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  const token = req.cookies.get("electron_session")?.value;
  const secret = process.env.JWT_SECRET;
  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      if (payload.role === "admin") return NextResponse.next();
    } catch {}
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}
export const config = { matcher: ["/admin/:path*"] };
