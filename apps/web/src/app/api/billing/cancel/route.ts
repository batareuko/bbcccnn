import { db } from "@/lib/db";
import { HttpError, requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { cancelPaddleSubscription } from "@/lib/billing/paddle";
import { cancelWfpSubscription } from "@/lib/billing/wayforpay";

/** Stops renewal. Access stays until the end of the paid period. */
export const POST = handler(async () => {
  const a = await requireAuth();
  const m = await db.membership.findUnique({ where: { userId_workspaceId: { userId: a.userId, workspaceId: a.workspaceId } } });
  if (m?.role !== "owner") throw new HttpError(403, "Only the owner can manage billing");
  const ws = await db.workspace.findUniqueOrThrow({ where: { id: a.workspaceId } });
  if (ws.billingStatus !== "active" && ws.billingStatus !== "past_due") throw new HttpError(400, "No active subscription");
  try {
    if (ws.billingProvider === "paddle" && ws.paddleSubscriptionId) await cancelPaddleSubscription(ws.paddleSubscriptionId);
    else if (ws.billingProvider === "wayforpay" && ws.wfpRegularRef) await cancelWfpSubscription(ws.wfpRegularRef);
    else throw new HttpError(400, "No active subscription");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    console.error("[billing] cancel failed", e);
    throw new HttpError(502, "Couldn't cancel with the payment provider, please try again");
  }
  await db.workspace.update({ where: { id: ws.id }, data: { cancelAtPeriodEnd: true } });
  return { ok: true };
});
