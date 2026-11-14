import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth";
import { handler } from "@/lib/api";
import { withSessionCookie } from "@/lib/session-cookie";

export const POST = handler(async () => {
  const auth = (await headers()).get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  return withSessionCookie(NextResponse.json({ ok: true }), null);
});
