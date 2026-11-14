import { NextResponse, type NextRequest } from "next/server";

/** Redirect signed-out browsers to /login. API routes do their own auth (cookie or Bearer). */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("pf_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
}

export const config = { matcher: ["/app/:path*"] };
