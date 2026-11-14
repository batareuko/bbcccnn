import { db } from "@/lib/db";
import { HttpError, requireAuth, assertActive } from "@/lib/auth";
import { handler } from "@/lib/api";
import { PostInput } from "@/lib/post-input";
import { planOf } from "@/lib/plans";
import { moderationFields } from "@/lib/moderation";

/** GET /api/posts?from=ISO&to=ISO&status=scheduled */
export const GET = handler(async (req: Request) => {
  const a = await requireAuth();
  const q = new URL(req.url).searchParams;
  const from = q.get("from"), to = q.get("to"), status = q.get("status");
  return db.post.findMany({
    where: {
      workspaceId: a.workspaceId,
      ...(status ? { status } : {}),
      ...(from || to
        ? { scheduledAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } }
        : {}),
    },
    include: { targets: { include: { channel: { select: { id: true, name: true, platform: true, color: true } } } } },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
    take: 500,
  });
});

export const POST = handler(async (req: Request) => {
  const a = await requireAuth();
  const b = PostInput.parse(await req.json());
  if (b.status === "scheduled") assertActive(a);
  if (b.status === "scheduled") {
    if (!b.scheduledAt) throw new HttpError(400, "scheduledAt is required for scheduled posts");
    if (!b.targets.length) throw new HttpError(400, "Choose at least one channel");
    const count = await db.post.count({ where: { workspaceId: a.workspaceId, status: "scheduled" } });
    if (count >= planOf(a.plan).maxScheduledPosts) throw new HttpError(402, "Scheduled posts limit reached for your plan");
  }
  const channels = await db.channel.count({
    where: { workspaceId: a.workspaceId, id: { in: b.targets.map((t) => t.channelId) } },
  });
  if (channels !== b.targets.length) throw new HttpError(400, "Unknown channel");
  return db.post.create({
    data: {
      workspaceId: a.workspaceId,
      title: b.title,
      content: b.content,
      mediaUrls: JSON.stringify(b.mediaUrls),
      link: b.link ?? null,
      ...moderationFields(b.status, [b.title, b.content, ...b.targets.map((t) => t.contentOverride)]),
      scheduledAt: b.scheduledAt ?? null,
      targets: { create: b.targets.map((t) => ({ channelId: t.channelId, contentOverride: t.contentOverride || null })) },
    },
    include: { targets: true },
  });
});
