/**
 * Subscription plans. New workspaces start a 14-day trial with Pro limits.
 * AI is NOT part of a plan: it is billed separately via prepaid AI credits (Workspace.aiCredits).
 * Billing (Stripe / WayForPay / LiqPay) plugs in later and simply sets Workspace.plan.
 */
import { GRACE_DAYS } from "./billing/catalog";

export const TRIAL_DAYS = 14;

export const PLANS = {
  trial: { label: "Trial", maxChannels: 15, maxScheduledPosts: 1000, sources: 10, active: true },
  starter: { label: "Starter", maxChannels: 5, maxScheduledPosts: 200, sources: 2, active: true },
  pro: { label: "Pro", maxChannels: 15, maxScheduledPosts: 1000, sources: 10, active: true },
  agency: { label: "Agency", maxChannels: 100, maxScheduledPosts: 100000, sources: 100, active: true },
  /** Trial ended and no paid plan: read-only. */
  expired: { label: "Expired", maxChannels: 0, maxScheduledPosts: 0, sources: 0, active: false },
} as const;

export type PlanId = keyof typeof PLANS;

/** The plan that is actually in force right now (trial turns into "expired" after trialEndsAt). */
export function effectivePlanId(ws: {
  plan: string;
  trialEndsAt: Date | null;
  currentPeriodEnd?: Date | null;
  billingStatus?: string | null;
}): PlanId {
  if (ws.plan === "trial") return ws.trialEndsAt && ws.trialEndsAt > new Date() ? "trial" : "expired";
  if (!(ws.plan in PLANS) || ws.plan === "expired") return "expired";
  // paid plan: active until the paid period ends; a grace period applies only while a renewal is being retried
  const grace = ws.billingStatus === "canceled" ? 0 : GRACE_DAYS * 864e5;
  if (ws.currentPeriodEnd && ws.currentPeriodEnd.getTime() + grace < Date.now()) return "expired";
  return ws.plan as PlanId;
}

export function planOf(id: string) {
  return PLANS[(id in PLANS ? id : "expired") as PlanId];
}

export function trialDaysLeft(ws: { plan: string; trialEndsAt: Date | null }) {
  if (ws.plan !== "trial" || !ws.trialEndsAt) return null;
  return Math.max(0, Math.ceil((ws.trialEndsAt.getTime() - Date.now()) / 864e5));
}
