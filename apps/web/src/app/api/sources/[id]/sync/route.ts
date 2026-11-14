import { db } from "@/lib/db";
import { HttpError, requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { syncSource } from "@/lib/sources";

export const POST = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const a = await requireAuth();
  const { id } = await params;
  if (!(await db.source.findFirst({ where: { id, workspaceId: a.workspaceId } }))) throw new HttpError(404, "Source not found");
  try {
    return await syncSource(id);
  } catch (e) {
    throw new HttpError(502, e instanceof Error ? e.message : String(e));
  }
});
