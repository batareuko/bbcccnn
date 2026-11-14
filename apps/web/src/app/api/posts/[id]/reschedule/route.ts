import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { planOf } from "@/lib/plans";

const Body = z.object({ scheduledAt: z.coerce.date() });

/** Used by calendar drag & drop: moves a not-yet-published post to a new time. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireAuth();
  const { id } = await params;
  if (!planOf(a.plan).active) throw new HttpError(402, "Your plan is not active — choose a plan to continue");
  const { scheduledAt } = Body.parse(await req.json());
  const r = await db.post.updateMany({
    where: { id, workspaceId: a.workspaceId, status: { in: ["draft", "scheduled", "failed"] } },
    data: { scheduledAt },
  });
  if (!r.count) throw new HttpError(409, "Post can't be moved (not found or already published)");
  return { ok: true, scheduledAt };
});
