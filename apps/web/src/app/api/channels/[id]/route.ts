import { db } from "@/lib/db";
import { HttpError, requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";

export const DELETE = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireAuth();
  const { id } = await params;
  const r = await db.channel.deleteMany({ where: { id, workspaceId: a.workspaceId } });
  if (!r.count) throw new HttpError(404, "Channel not found");
  return { ok: true };
});
