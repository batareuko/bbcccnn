import { db } from "../db";
import { addInterval, type Interval, type PaidPlan } from "./catalog";

/** Turns on (or renews) a paid plan until `periodEnd`. */
export async function activatePlan(
  workspaceId: string,
  opts: {
    plan: PaidPlan;
    interval: Interval;
    provider: "wayforpay" | "paddle";
    periodEnd: Date;
    paddleSubscriptionId?: string;
    paddleCustomerId?: string;
    wfpRegularRef?: string;
  },
) {
  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      plan: opts.plan,
      billingInterval: opts.interval,
      billingProvider: opts.provider,
      billingStatus: "active",
      currentPeriodEnd: opts.periodEnd,
      cancelAtPeriodEnd: false,
      ...(opts.paddleSubscriptionId ? { paddleSubscriptionId: opts.paddleSubscriptionId } : {}),
      ...(opts.paddleCustomerId ? { paddleCustomerId: opts.paddleCustomerId } : {}),
      ...(opts.wfpRegularRef ? { wfpRegularRef: opts.wfpRegularRef } : {}),
    },
  });
}

/** Extends the current period by one interval (renewal). Never shortens it. */
export async function extendPeriod(workspaceId: string) {
  const ws = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const interval = (ws.billingInterval ?? "month") as Interval;
  const base = ws.currentPeriodEnd && ws.currentPeriodEnd > new Date() ? ws.currentPeriodEnd : new Date();
  const periodEnd = addInterval(base, interval);
  await db.workspace.update({
    where: { id: workspaceId },
    data: { currentPeriodEnd: periodEnd, billingStatus: "active" },
  });
  return periodEnd;
}

export async function addPurchasedCredits(workspaceId: string, credits: number) {
  await db.$transaction([
    db.workspace.update({ where: { id: workspaceId }, data: { aiCredits: { increment: credits } } }),
    db.aiUsage.create({ data: { workspaceId, kind: "topup", credits } }),
  ]);
}

/**
 * Marks a payment as paid exactly once. Returns false if it was already paid
 * (duplicate webhook) so callers skip side effects.
 */
export async function markPaidOnce(paymentId: string) {
  const r = await db.payment.updateMany({
    where: { id: paymentId, status: { not: "paid" } },
    data: { status: "paid", paidAt: new Date(), error: null },
  });
  return r.count === 1;
}
