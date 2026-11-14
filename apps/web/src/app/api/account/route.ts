import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireAuth, verifyPassword } from "@/lib/auth";
import { handler } from "@/lib/api";
import { withSessionCookie } from "@/lib/session-cookie";

const Body = z.object({ password: z.string().min(1) });

/**
 * Deletes the signed-in user and every workspace where they are the only member
 * (posts, channels with their tokens, sources cascade). Payment records of deleted
 * workspaces go with them; keep accounting exports outside the app DB.
 */
export const DELETE = handler(async (req: Request) => {
  const a = await requireAuth();
  const { password } = Body.parse(await req.json());
  const user = await db.user.findUniqueOrThrow({
    where: { id: a.userId },
    include: { memberships: { include: { workspace: { include: { _count: { select: { members: true } } } } } } },
  });
  if (!(await verifyPassword(password, user.passwordHash))) throw new HttpError(403, "Wrong password");

  const solo = user.memberships.filter((m) => m.workspace._count.members === 1).map((m) => m.workspace);
  const active = solo.find((w) => (w.billingStatus === "active" || w.billingStatus === "past_due") && !w.cancelAtPeriodEnd);
  if (active) throw new HttpError(409, "Turn off auto-renewal on the Billing page before deleting your account");

  await db.$transaction([
    db.workspace.deleteMany({ where: { id: { in: solo.map((w) => w.id) } } }),
    db.user.delete({ where: { id: user.id } }), // sessions & memberships cascade
  ]);
  return withSessionCookie(NextResponse.json({ ok: true }), null);
});
