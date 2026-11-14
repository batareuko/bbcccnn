import { db } from "@/lib/db";
import { handler } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { getStatus } from "@/lib/system";
import { effectivePlanId } from "@/lib/plans";
import { PLAN_PRICES, type Interval, type PaidPlan } from "@/lib/billing/catalog";
import { aiProvider, isAiConfigured } from "@/lib/ai/providers";
import { wfpConfigured } from "@/lib/billing/wayforpay";
import { paddleConfigured } from "@/lib/billing/paddle";
import { sharedBotConfigured, tgCall } from "@/lib/telegram/bot";
import { holdFlagged, moderationKeywords } from "@/lib/moderation";

export const dynamic = "force-dynamic";

const DAY = 864e5;

/** Technical dashboard: health, queue, failures, money, AI and integrations. */
export const GET = handler(async () => {
  await requireAdmin();
  const now = Date.now();
  const d1 = new Date(now - DAY), d7 = new Date(now - 7 * DAY), d30 = new Date(now - 30 * DAY);

  const [
    heartbeat, usersTotal, usersNew7, usersBlocked, workspaces, postsByStatus, overdue, stuck,
    published24, failed24, targets7, recentFailures, payments30, aiUsage7, reviewCount, flaggedCount,
  ] = await Promise.all([
    getStatus<{ via: string; at: string; published: number }>("scheduler.lastTick"),
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.user.count({ where: { blockedAt: { not: null } } }),
    db.workspace.findMany({
      select: { plan: true, trialEndsAt: true, currentPeriodEnd: true, billingStatus: true, billingProvider: true, billingInterval: true, suspendedAt: true, cancelAtPeriodEnd: true },
    }),
    db.post.groupBy({ by: ["status"], _count: true }),
    // overdue = should have been published already; posts of inactive/suspended workspaces wait on purpose
    db.post
      .findMany({
        where: { status: "scheduled", scheduledAt: { lt: new Date(now - 5 * 60_000) } },
        select: { workspace: { select: { plan: true, trialEndsAt: true, currentPeriodEnd: true, billingStatus: true, suspendedAt: true } } },
        take: 1000,
      })
      .then((rows) => rows.filter((r) => effectivePlanId(r.workspace) !== "expired").length),
    db.post.count({ where: { status: "publishing", updatedAt: { lt: new Date(now - 15 * 60_000) } } }),
    db.post.count({ where: { status: "published", publishedAt: { gte: d1 } } }),
    db.post.count({ where: { status: "failed", updatedAt: { gte: d1 } } }),
    db.postTarget.findMany({
      where: { status: { in: ["published", "failed"] }, post: { updatedAt: { gte: d7 } } },
      select: { status: true, channel: { select: { platform: true } } },
    }),
    db.postTarget.findMany({
      where: { status: "failed" },
      orderBy: { post: { updatedAt: "desc" } },
      take: 25,
      select: { error: true, channel: { select: { platform: true, name: true } }, post: { select: { id: true, workspaceId: true, updatedAt: true } } },
    }),
    db.payment.findMany({ where: { createdAt: { gte: d30 } }, select: { status: true, amount: true, currency: true, provider: true, kind: true } }),
    db.aiUsage.findMany({ where: { createdAt: { gte: d7 } }, select: { kind: true, credits: true, provider: true } }),
    db.post.count({ where: { status: "review" } }),
    db.post.count({ where: { flagged: true, moderatedAt: null } }),
  ]);

  // plans & subscriptions
  const plans: Record<string, number> = {};
  const mrr: Record<string, number> = { UAH: 0, USD: 0 };
  const subs: Record<string, number> = {};
  let suspended = 0;
  for (const w of workspaces) {
    const p = effectivePlanId(w);
    plans[p] = (plans[p] ?? 0) + 1;
    if (w.suspendedAt) suspended++;
    if (["starter", "pro", "agency"].includes(p) && w.billingStatus === "active" && w.billingProvider !== "manual") {
      const key = `${w.billingProvider ?? "?"}:${p}:${w.billingInterval ?? "month"}`;
      subs[key] = (subs[key] ?? 0) + 1;
      if (!w.cancelAtPeriodEnd && (w.billingProvider === "wayforpay" || w.billingProvider === "paddle")) {
        const cur = w.billingProvider === "wayforpay" ? "uah" : "usd";
        const price = PLAN_PRICES[p as PaidPlan][(w.billingInterval ?? "month") as Interval][cur];
        mrr[cur.toUpperCase()] += w.billingInterval === "year" ? price / 12 : price;
      }
    }
  }

  // delivery by platform
  const byPlatform: Record<string, { published: number; failed: number }> = {};
  for (const t of targets7) {
    const k = t.channel.platform;
    byPlatform[k] ??= { published: 0, failed: 0 };
    byPlatform[k][t.status as "published" | "failed"]++;
  }
  // most common errors
  const errorGroups: Record<string, number> = {};
  for (const f of recentFailures) {
    const k = `${f.channel.platform}: ${(f.error ?? "unknown").slice(0, 120)}`;
    errorGroups[k] = (errorGroups[k] ?? 0) + 1;
  }

  const money = { paid: {} as Record<string, number>, paidCount: 0, failedCount: 0 };
  for (const p of payments30) {
    if (p.status === "paid") {
      money.paid[p.currency] = (money.paid[p.currency] ?? 0) + p.amount / 100;
      money.paidCount++;
    } else if (p.status === "failed") money.failedCount++;
  }

  const ai = { spent: 0, topups: 0, byKind: {} as Record<string, number>, byProvider: {} as Record<string, number> };
  for (const u of aiUsage7) {
    if (u.credits < 0) {
      ai.spent += -u.credits;
      ai.byKind[u.kind] = (ai.byKind[u.kind] ?? 0) - u.credits;
      if (u.provider) ai.byProvider[u.provider] = (ai.byProvider[u.provider] ?? 0) - u.credits;
    } else if (u.kind === "topup") ai.topups += u.credits;
  }

  let telegramWebhook: unknown = null;
  if (sharedBotConfigured()) {
    try {
      telegramWebhook = await Promise.race([
        tgCall("getWebhookInfo", {}),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
      ]);
    } catch (e) {
      telegramWebhook = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const lastTickAge = heartbeat ? Math.round((now - heartbeat.updatedAt.getTime()) / 1000) : null;
  return {
    generatedAt: new Date(now),
    health: {
      scheduler: { lastTickAgeSec: lastTickAge, via: heartbeat?.value.via ?? null, ok: lastTickAge !== null && lastTickAge < 300 },
      overdue,
      stuckPublishing: stuck,
      published24,
      failed24,
    },
    users: { total: usersTotal, new7: usersNew7, blocked: usersBlocked },
    workspaces: { total: workspaces.length, suspended, plans },
    subscriptions: subs,
    mrr,
    payments30: money,
    posts: Object.fromEntries(postsByStatus.map((g) => [g.status, g._count])),
    delivery7: byPlatform,
    errorGroups: Object.entries(errorGroups).sort((a, b) => b[1] - a[1]).slice(0, 8),
    recentFailures: recentFailures.slice(0, 12).map((f) => ({
      platform: f.channel.platform, channel: f.channel.name, error: f.error, postId: f.post.id, workspaceId: f.post.workspaceId, at: f.post.updatedAt,
    })),
    ai,
    moderation: { review: reviewCount, flagged: flaggedCount, keywords: moderationKeywords().length, hold: holdFlagged() },
    integrations: {
      ai: { provider: aiProvider(), configured: isAiConfigured() },
      wayforpay: wfpConfigured(),
      wayforpayRegularApi: !!process.env.WAYFORPAY_MERCHANT_PASSWORD,
      paddle: paddleConfigured(),
      paddleEnv: process.env.PADDLE_ENV || "sandbox",
      telegramBot: sharedBotConfigured(),
      cronSecret: !!process.env.CRON_SECRET,
      legalDetails: !!(process.env.LEGAL_NAME && process.env.LEGAL_TAX_ID && process.env.LEGAL_EMAIL),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    },
    telegramWebhook,
  };
});
