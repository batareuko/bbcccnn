import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { PUBLISHERS } from "@/lib/publishers";
import { planOf } from "@/lib/plans";

const Body = z.object({
  platform: z.string().refine((p) => p in PUBLISHERS, "Unknown platform"),
  name: z.string().min(1).max(100),
  externalId: z.string().min(1),
  accessToken: z.string().default(""),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

const publicFields = { id: true, platform: true, name: true, externalId: true, color: true, createdAt: true } as const;

export const GET = handler(async () => {
  const a = await requireAuth();
  return db.channel.findMany({ where: { workspaceId: a.workspaceId }, select: publicFields, orderBy: { createdAt: "asc" } });
});

export const POST = handler(async (req: Request) => {
  const a = await requireAuth();
  const b = Body.parse(await req.json());
  const count = await db.channel.count({ where: { workspaceId: a.workspaceId } });
  if (count >= planOf(a.plan).maxChannels) throw new HttpError(402, "Channel limit reached for your plan");
  const pub = PUBLISHERS[b.platform];
  if (pub.verify) {
    try {
      await pub.verify({ externalId: b.externalId, accessToken: b.accessToken });
    } catch (e) {
      throw new HttpError(400, `Can't connect: ${e instanceof Error ? e.message : e}`);
    }
  }
  return db.channel.create({ data: { ...b, workspaceId: a.workspaceId }, select: publicFields });
});
