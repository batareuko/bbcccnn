import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { handler } from "@/lib/api";
import { logAction, requireAdmin } from "@/lib/admin";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("block"), reason: z.string().min(3).max(500) }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("flag"), reason: z.string().min(3).max(500) }),
  z.object({ action: z.literal("unflag") }),
]);

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const b = Body.parse(await req.json());
  const post = await db.post.findUnique({ where: { id } });
  if (!post) throw new HttpError(404, "Post not found");
  const now = new Date();

  if (b.action === "block") {
    if (post.status === "published" || post.status === "publishing")
      throw new HttpError(409, "Already published — remove it in the social network and suspend the workspace if needed");
    await db.post.update({ where: { id }, data: { status: "blocked", flagged: true, flagReason: b.reason, moderatedAt: now } });
  } else if (b.action === "approve") {
    const status = post.status === "review" || post.status === "blocked" ? (post.scheduledAt ? "scheduled" : "draft") : post.status;
    await db.post.update({ where: { id }, data: { status, flagged: false, moderatedAt: now } });
  } else if (b.action === "flag") {
    await db.post.update({ where: { id }, data: { flagged: true, flagReason: b.reason } });
  } else {
    await db.post.update({ where: { id }, data: { flagged: false, moderatedAt: now } });
  }
  await logAction(admin, `post.${b.action}`, "post", id, { workspaceId: post.workspaceId, ...("reason" in b ? { reason: b.reason } : {}) });
  return { ok: true };
});
