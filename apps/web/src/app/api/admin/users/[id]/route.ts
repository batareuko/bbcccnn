import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { handler } from "@/lib/api";
import { logAction, requireAdmin } from "@/lib/admin";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("block"), reason: z.string().min(3).max(500) }),
  z.object({ action: z.literal("unblock") }),
  z.object({ action: z.literal("make_admin") }),
  z.object({ action: z.literal("remove_admin") }),
]);

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const b = Body.parse(await req.json());
  if (id === admin.userId && b.action !== "make_admin") throw new HttpError(400, "You can't do this to your own account");
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, "User not found");

  if (b.action === "block") {
    await db.$transaction([
      db.user.update({ where: { id }, data: { blockedAt: new Date(), blockReason: b.reason } }),
      db.session.deleteMany({ where: { userId: id } }), // sign out everywhere
    ]);
  } else if (b.action === "unblock") {
    await db.user.update({ where: { id }, data: { blockedAt: null, blockReason: null } });
  } else {
    await db.user.update({ where: { id }, data: { role: b.action === "make_admin" ? "admin" : "user" } });
  }
  await logAction(admin, `user.${b.action}`, "user", id, { email: user.email, ...("reason" in b ? { reason: b.reason } : {}) });
  return { ok: true };
});
