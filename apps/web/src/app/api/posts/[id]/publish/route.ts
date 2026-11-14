import { db } from "@/lib/db";
import { HttpError, requireAuth, assertActive } from "@/lib/auth";
import { handler } from "@/lib/api";
import { publishPost } from "@/lib/scheduler";

/** Publish right now, ignoring the schedule. Also retries failed targets. */
export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireAuth();
  const { id } = await params;
  assertActive(a);
  const post = await db.post.findFirst({ where: { id, workspaceId: a.workspaceId }, include: { targets: true } });
  if (!post) throw new HttpError(404, "Post not found");
  if (!post.targets.length) throw new HttpError(400, "Choose at least one channel");
  return publishPost(id);
});
