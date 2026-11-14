import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireAuth, assertActive } from "@/lib/auth";
import { handler } from "@/lib/api";
import { AiError, AiUpstreamError, aiKeyEnvName, generateContentPlan, isAiConfigured } from "@/lib/ai/agents";
import { planOf } from "@/lib/plans";
import { withCredits } from "@/lib/ai/credits";
import { partsInTz, zonedToUtc } from "@/lib/tz";

export const maxDuration = 300;

const Body = z.object({
  product: z.string().min(10).max(5000),
  audience: z.string().max(500).optional(),
  goal: z.string().max(500).optional(),
  keywords: z.string().max(500).optional(),
  channelIds: z.array(z.string()).min(1).max(20),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(31),
  postsPerWeek: z.number().int().min(1).max(21),
  language: z.string().max(50).optional(),
  tone: z.string().max(200).optional(),
  /** "draft" (review first, default) or "scheduled" (straight to the queue) */
  status: z.enum(["draft", "scheduled"]).default("draft"),
});

/** AI promotion agent: generates a content plan and puts it on the calendar. */
export const POST = handler(async (req: Request) => {
  const a = await requireAuth();
  const plan = planOf(a.plan);
  assertActive(a);
  if (!isAiConfigured()) throw new HttpError(503, `AI is not configured (${aiKeyEnvName()})`);
  const b = Body.parse(await req.json());

  const [ws, channels] = await Promise.all([
    db.workspace.findUniqueOrThrow({ where: { id: a.workspaceId } }),
    db.channel.findMany({ where: { workspaceId: a.workspaceId, id: { in: b.channelIds } } }),
  ]);
  if (channels.length !== b.channelIds.length) throw new HttpError(400, "Unknown channel");

  let items;
  try {
    // 1 credit per requested post; unused credits are refunded if the AI returns fewer posts.
    const requested = Math.max(1, Math.round((b.days / 7) * b.postsPerWeek));
    items = await withCredits(
      a.workspaceId,
      requested,
      "content_plan",
      () => generateContentPlan({ ...b, platforms: channels.map((c) => c.platform) }),
      (r) => r.length,
    );
  } catch (e) {
    if (e instanceof AiError) throw new HttpError(422, e.message);
    if (e instanceof AiUpstreamError) throw new HttpError(e.status, e.message);
    throw e;
  }

  if (b.status === "scheduled") {
    const count = await db.post.count({ where: { workspaceId: a.workspaceId, status: "scheduled" } });
    if (count + items.length > plan.maxScheduledPosts) throw new HttpError(402, "Scheduled posts limit reached for your plan");
  }

  const [y, m, d] = b.startDate.split("-").map(Number);
  const created = await db.$transaction(
    items.map((it) => {
      const [hh, mm] = it.time.split(":").map(Number);
      // compute the calendar day in the workspace tz, then the exact instant
      const noon = zonedToUtc(y, m, d + it.day, 12, 0, ws.timezone);
      const p = partsInTz(noon, ws.timezone);
      const at = zonedToUtc(p.year, p.month, p.day, hh, mm, ws.timezone);
      return db.post.create({
        data: {
          workspaceId: a.workspaceId,
          title: `[${it.pillar}] ${it.title}`.slice(0, 300),
          content: it.text,
          status: b.status,
          scheduledAt: at,
          targets: { create: channels.map((c) => ({ channelId: c.id })) },
        },
        select: { id: true, title: true, scheduledAt: true },
      });
    }),
  );
  return { created: created.length, posts: created };
});
