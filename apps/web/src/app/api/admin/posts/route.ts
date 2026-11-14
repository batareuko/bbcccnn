import { db } from "@/lib/db";
import { handler } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";

/** GET /api/admin/posts?filter=all|flagged|review|blocked|failed&q=text */
export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const sp = new URL(req.url).searchParams;
  const filter = sp.get("filter") ?? "all";
  const q = (sp.get("q") ?? "").trim();
  const where = {
    ...(filter === "flagged" ? { flagged: true } : {}),
    ...(filter === "review" ? { status: "review" } : {}),
    ...(filter === "blocked" ? { status: "blocked" } : {}),
    ...(filter === "failed" ? { status: "failed" } : {}),
    ...(q ? { OR: [{ content: { contains: q } }, { title: { contains: q } }, { id: q }, { workspaceId: q }] } : {}),
  };
  const posts = await db.post.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      workspace: { select: { id: true, name: true, suspendedAt: true } },
      targets: { select: { status: true, error: true, contentOverride: true, channel: { select: { name: true, platform: true, color: true } } } },
    },
  });
  return posts;
});
