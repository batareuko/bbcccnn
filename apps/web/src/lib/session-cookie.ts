import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "./auth";

export function withSessionCookie(res: NextResponse, token: string | null) {
  res.cookies.set(SESSION_COOKIE, token ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: token ? 30 * 86400 : 0,
  });
  return res;
}
