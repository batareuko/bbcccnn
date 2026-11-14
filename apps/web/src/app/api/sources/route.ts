import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { planOf } from "@/lib/plans";

const SourceBody = z.object({
  type: z.enum(["wordpress", "rss"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
  template: z.string().min(1).max(5000).default("{title}\n\n{excerpt}\n\n{link}"),
  channelIds: z.array(z.string()).default([]),
  delayMinutes: z.number().int().min(0).max(10080).default(0),
  aiRewrite: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

export const GET = handler(async () => {
  const a = await requireAuth();
  return db.source.findMany({ where: { workspaceId: a.workspaceId }, orderBy: { createdAt: "asc" } });
});

export const POST = handler(async (req: Request) => {
  const a = await requireAuth();
  const b = SourceBody.parse(await req.json());
  const count = await db.source.count({ where: { workspaceId: a.workspaceId } });
  if (count >= planOf(a.plan).sources) throw new HttpError(402, "Source limit reached for your plan");
  const owned = await db.channel.count({ where: { workspaceId: a.workspaceId, id: { in: b.channelIds } } });
  if (owned !== b.channelIds.length) throw new HttpError(400, "Unknown channel");
  return db.source.create({
    data: { ...b, channelIds: JSON.stringify(b.channelIds), workspaceId: a.workspaceId },
  });
});
