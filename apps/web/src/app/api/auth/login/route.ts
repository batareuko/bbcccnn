import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, HttpError, verifyPassword } from "@/lib/auth";
import { handler } from "@/lib/api";
import { withSessionCookie } from "@/lib/session-cookie";

const Body = z.object({ email: z.string().transform((s) => s.toLowerCase()), password: z.string() });

export const POST = handler(async (req: Request) => {
  const b = Body.parse(await req.json());
  const user = await db.user.findUnique({ where: { email: b.email } });
  if (!user || !(await verifyPassword(b.password, user.passwordHash)))
    throw new HttpError(401, "Wrong email or password");
  const token = await createSession(user.id);
  return withSessionCookie(NextResponse.json({ token, user: { id: user.id, email: user.email } }), token);
});
