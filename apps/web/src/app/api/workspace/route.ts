import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { isValidTz } from "@/lib/tz";

const Body = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().refine(isValidTz, "Unknown time zone").optional(),
});

export const PATCH = handler(async (req: Request) => {
  const a = await requireAuth();
  const m = await db.membership.findUnique({ where: { userId_workspaceId: { userId: a.userId, workspaceId: a.workspaceId } } });
  if (m?.role !== "owner") throw new HttpError(403, "Only the owner can change workspace settings");
  const b = Body.parse(await req.json());
  return db.workspace.update({ where: { id: a.workspaceId }, data: b });
});
