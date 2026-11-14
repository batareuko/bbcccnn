import { db } from "@/lib/db";
import { HttpError, requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { planOf } from "@/lib/plans";
import { publishPost } from "@/lib/scheduler";

/** Publish right now, ignoring the schedule. Also retries failed targets. */
export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireAuth();
  const { id } = await params;
  if (!planOf(a.plan).active) throw new HttpError(402, "Your plan is not active — choose a plan to continue");
  const post = await db.post.findFirst({ where: { id, workspaceId: a.workspaceId }, include: { targets: true } });
  if (!post) throw new HttpError(404, "Post not found");
  if (!post.targets.length) throw new HttpError(400, "Choose at least one channel");
  return publishPost(id);
});
