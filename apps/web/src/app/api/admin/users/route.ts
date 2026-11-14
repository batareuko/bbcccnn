import { db } from "@/lib/db";
import { handler } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { effectivePlanId, trialDaysLeft } from "@/lib/plans";

/** GET /api/admin/users?q=email-or-workspace&page=0 */
export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  const page = Math.max(0, Number(sp.get("page") ?? 0));
  const where = q
    ? { OR: [{ email: { contains: q } }, { memberships: { some: { workspace: { name: { contains: q } } } } }, { id: q }] }
    : {};
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * 50,
      take: 50,
      include: {
        memberships: {
          include: {
            workspace: { include: { _count: { select: { posts: true, channels: true, members: true } } } },
          },
        },
        sessions: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);
  return {
    total,
    page,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.sessions[0]?.createdAt ?? null,
      blockedAt: u.blockedAt,
      blockReason: u.blockReason,
      workspaces: u.memberships.map(({ role, workspace: w }) => ({
        id: w.id,
        name: w.name,
        role,
        plan: effectivePlanId(w),
        storedPlan: w.plan,
        trialDaysLeft: trialDaysLeft(w),
        billing: { provider: w.billingProvider, status: w.billingStatus, interval: w.billingInterval, periodEnd: w.currentPeriodEnd },
        aiCredits: w.aiCredits,
        suspendedAt: w.suspendedAt,
        suspendReason: w.suspendReason,
        counts: w._count,
      })),
    })),
  };
});
