import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireAuth, assertActive } from "@/lib/auth";
import { handler } from "@/lib/api";

const Body = z.object({ scheduledAt: z.coerce.date() });

/** Used by calendar drag & drop: moves a not-yet-published post to a new time. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireAuth();
  const { id } = await params;
  assertActive(a);
  const { scheduledAt } = Body.parse(await req.json());
  const r = await db.post.updateMany({
    where: { id, workspaceId: a.workspaceId, status: { in: ["draft", "scheduled", "failed"] } },
    data: { scheduledAt },
  });
  if (!r.count) throw new HttpError(409, "Post can't be moved (not found or already published)");
  return { ok: true, scheduledAt };
});
