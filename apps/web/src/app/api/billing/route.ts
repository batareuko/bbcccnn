import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { CREDIT_PACK, MAX_PACKS, PLAN_PRICES } from "@/lib/billing/catalog";
import { paddleClientConfig } from "@/lib/billing/paddle";
import { wfpConfigured } from "@/lib/billing/wayforpay";
import { effectivePlanId, trialDaysLeft } from "@/lib/plans";

/** Everything the billing page needs. */
export const GET = handler(async () => {
  const a = await requireAuth();
  const ws = await db.workspace.findUniqueOrThrow({ where: { id: a.workspaceId } });
  const payments = await db.payment.findMany({
    where: { workspaceId: ws.id, status: { in: ["paid", "failed"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return {
    workspaceId: ws.id,
    email: a.email,
    plan: effectivePlanId(ws),
    storedPlan: ws.plan,
    trialDaysLeft: trialDaysLeft(ws),
    billing: {
      provider: ws.billingProvider,
      interval: ws.billingInterval,
      status: ws.billingStatus,
      currentPeriodEnd: ws.currentPeriodEnd,
      cancelAtPeriodEnd: ws.cancelAtPeriodEnd,
    },
    aiCredits: ws.aiCredits,
    catalog: { plans: PLAN_PRICES, creditPack: CREDIT_PACK, maxPacks: MAX_PACKS },
    providers: { wayforpay: wfpConfigured(), paddle: paddleClientConfig() },
    payments: payments.map((p) => ({
      id: p.id, provider: p.provider, kind: p.kind, plan: p.plan, interval: p.interval, credits: p.credits,
      amount: p.amount / 100, currency: p.currency, status: p.status, error: p.error, date: p.paidAt ?? p.createdAt,
    })),
  };
});
