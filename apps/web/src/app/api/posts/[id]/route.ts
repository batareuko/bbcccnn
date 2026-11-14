import { db } from "@/lib/db";
import { HttpError, requireAuth, assertActive } from "@/lib/auth";
import { handler } from "@/lib/api";
import { moderationFields } from "@/lib/moderation";
import { PostInput } from "@/lib/post-input";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string, workspaceId: string) {
  const post = await db.post.findFirst({
    where: { id, workspaceId },
    include: { targets: { include: { channel: { select: { id: true, name: true, platform: true, color: true } } } } },
  });
  if (!post) throw new HttpError(404, "Post not found");
  return post;
}

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const a = await requireAuth();
  return load((await params).id, a.workspaceId);
});

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const a = await requireAuth();
  assertActive(a);
  const { id } = await params;
  const existing = await load(id, a.workspaceId);
  if (existing.status === "publishing" || existing.status === "published")
    throw new HttpError(409, "Published posts can't be edited");
  if (existing.status === "blocked") throw new HttpError(409, "This post was blocked by a moderator");
  const b = PostInput.parse(await req.json());
  if (b.status === "scheduled" && (!b.scheduledAt || !b.targets.length))
    throw new HttpError(400, "Scheduled posts need a time and at least one channel");
  const owned = await db.channel.count({
    where: { workspaceId: a.workspaceId, id: { in: b.targets.map((t) => t.channelId) } },
  });
  if (owned !== b.targets.length) throw new HttpError(400, "Unknown channel");

  return db.$transaction(async (tx) => {
    await tx.postTarget.deleteMany({ where: { postId: id } });
    return tx.post.update({
      where: { id },
      data: {
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
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const a = await requireAuth();
  const { id } = await params;
  await load(id, a.workspaceId);
  await db.post.delete({ where: { id } });
  return { ok: true };
});
