import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword, HttpError } from "@/lib/auth";
import { handler } from "@/lib/api";
import { withSessionCookie } from "@/lib/session-cookie";
import { DEFAULT_TZ, isValidTz } from "@/lib/tz";
import { TRIAL_DAYS } from "@/lib/plans";
import { TRIAL_AI_CREDITS } from "@/lib/ai/credits";

const Body = z.object({
  email: z.string().email().transform((s) => s.toLowerCase()),
  password: z.string().min(8),
  name: z.string().max(100).optional(),
  workspaceName: z.string().max(100).optional(),
  /** Browser time zone; becomes the workspace default. */
  timezone: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const b = Body.parse(await req.json());
  if (await db.user.findUnique({ where: { email: b.email } })) throw new HttpError(409, "Email already registered");
  const user = await db.user.create({
    data: {
      email: b.email,
      name: b.name ?? "",
      passwordHash: await hashPassword(b.password),
      memberships: {
        create: { role: "owner", workspace: {
            create: {
              name: b.workspaceName || "My workspace",
              plan: "trial",
              trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 864e5),
              aiCredits: TRIAL_AI_CREDITS,
              aiUsage: { create: { kind: "trial", credits: TRIAL_AI_CREDITS } },
              timezone: b.timezone && isValidTz(b.timezone) ? b.timezone : DEFAULT_TZ,
            },
          }, },
      },
    },
  });
  const token = await createSession(user.id);
  // `token` is returned for mobile clients; browsers use the httpOnly cookie.
  return withSessionCookie(NextResponse.json({ token, user: { id: user.id, email: user.email } }), token);
});
