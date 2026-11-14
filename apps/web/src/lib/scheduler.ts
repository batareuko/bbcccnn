import { db } from "./db";
import { getPublisher } from "./publishers";
import { effectivePlanId, planOf } from "./plans";

/** Publishes one post to all of its pending targets. Safe to call repeatedly. */
export async function publishPost(postId: string) {
  // Claim the post atomically so two workers never publish it twice.
  const claimed = await db.post.updateMany({
    where: { id: postId, status: { in: ["draft", "scheduled", "failed"] } },
    data: { status: "publishing" },
  });
  if (claimed.count === 0) return { skipped: true };

  const post = await db.post.findUniqueOrThrow({
    where: { id: postId },
    include: { targets: { include: { channel: true } } },
  });
  const mediaUrls: string[] = JSON.parse(post.mediaUrls || "[]");

  let failures = 0;
  for (const t of post.targets) {
    if (t.status === "published") continue;
    try {
      if (t.channel.status === "disconnected")
        throw new Error("Channel is disconnected (the bot was removed) — reconnect it on the Channels page");
      const pub = getPublisher(t.channel.platform);
      const r = await pub.publish(
        { externalId: t.channel.externalId, accessToken: t.channel.accessToken },
        { text: t.contentOverride || post.content, mediaUrls, link: post.link },
      );
      await db.postTarget.update({
        where: { id: t.id },
        data: { status: "published", externalPostId: r.externalPostId, error: null, publishedAt: new Date() },
      });
    } catch (e) {
      failures++;
      await db.postTarget.update({
        where: { id: t.id },
        data: { status: "failed", error: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  const status = post.targets.length === 0 ? "failed" : failures === 0 ? "published" : "failed";
  await db.post.update({
    where: { id: postId },
    data: { status, publishedAt: status === "published" ? new Date() : null },
  });
  return { status, failures };
}

/** Publishes every scheduled post whose time has come. Called by the worker or /api/cron. */
export async function publishDuePosts() {
  const due = await db.post.findMany({
    where: { status: "scheduled", scheduledAt: { lte: new Date() } },
    select: { id: true, workspace: { select: { plan: true, trialEndsAt: true, currentPeriodEnd: true, billingStatus: true, suspendedAt: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });
  const results = [];
  for (const p of due) {
    // Posts of workspaces whose trial ended stay scheduled until they pick a plan.
    if (!planOf(effectivePlanId(p.workspace)).active) continue;
    results.push({ id: p.id, ...(await publishPost(p.id)) });
  }
  return results;
}
