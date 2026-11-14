/**
 * WayForPay (Ukrainian cards, UAH). Docs: https://wiki.wayforpay.com
 * - Checkout: a POST form to https://secure.wayforpay.com/pay signed with HMAC_MD5.
 * - Subscriptions use WayForPay "regular payments" (regularMode monthly/yearly).
 * - serviceUrl callback must be answered with a signed {orderReference,status:"accept",time,signature}.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { SITE_URL } from "../site";
import { CREDIT_PACK, PLAN_PRICES, addInterval, type Interval, type PaidPlan } from "./catalog";
import { activatePlan, addPurchasedCredits, extendPeriod, markPaidOnce } from "./service";

const PAY_URL = "https://secure.wayforpay.com/pay";
const REGULAR_API = "https://api.wayforpay.com/regularApi";

export function wfpConfigured() {
  return !!(process.env.WAYFORPAY_MERCHANT_ACCOUNT && process.env.WAYFORPAY_SECRET_KEY);
}

const md5 = (parts: (string | number)[]) =>
  createHmac("md5", process.env.WAYFORPAY_SECRET_KEY ?? "").update(parts.join(";"), "utf8").digest("hex");

export function wfpSign(parts: (string | number)[]) {
  return md5(parts);
}

const ddmmyyyy = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;

type CheckoutInput =
  | { kind: "plan"; plan: PaidPlan; interval: Interval }
  | { kind: "credits"; packs: number };

/** Creates a pending Payment and returns the signed form the browser must POST to WayForPay. */
export async function createWfpCheckout(
  ws: { id: string },
  user: { email: string },
  input: CheckoutInput,
  language: "UA" | "EN",
) {
  const merchantAccount = process.env.WAYFORPAY_MERCHANT_ACCOUNT!;
  const merchantDomainName = process.env.WAYFORPAY_DOMAIN || new URL(SITE_URL).hostname;
  const orderReference = `PF${input.kind === "plan" ? "S" : "C"}-${ws.id.slice(-8)}-${Date.now()}`;
  const orderDate = Math.floor(Date.now() / 1000);

  let productName: string, productPrice: number, productCount: number;
  const extra: Record<string, string> = {};
  if (input.kind === "plan") {
    const price = PLAN_PRICES[input.plan][input.interval].uah;
    productName = `PostFlow ${input.plan[0].toUpperCase() + input.plan.slice(1)} (${input.interval === "year" ? "1 рік" : "1 місяць"})`;
    productPrice = price;
    productCount = 1;
    // WayForPay regular payment: the card is charged automatically every period.
    extra.regularMode = input.interval === "year" ? "yearly" : "monthly";
    extra.regularAmount = String(price);
    extra.regularCount = input.interval === "year" ? "10" : "120";
    extra.dateNext = ddmmyyyy(addInterval(new Date(), input.interval));
    extra.regularOn = "1";
    extra.regularBehavior = "preset";
  } else {
    productName = `PostFlow AI credits ×${CREDIT_PACK.credits}`;
    productPrice = CREDIT_PACK.uah;
    productCount = input.packs;
  }
  const amount = productPrice * productCount;
  const currency = "UAH";

  await db.payment.create({
    data: {
      workspaceId: ws.id,
      provider: "wayforpay",
      externalId: orderReference,
      kind: input.kind === "plan" ? "subscription" : "credits",
      plan: input.kind === "plan" ? input.plan : null,
      interval: input.kind === "plan" ? input.interval : null,
      credits: input.kind === "credits" ? input.packs * CREDIT_PACK.credits : null,
      amount: amount * 100,
      currency,
    },
  });

  const fields: Record<string, string> = {
    merchantAccount,
    merchantAuthType: "SimpleSignature",
    merchantDomainName,
    merchantTransactionSecureType: "AUTO",
    orderReference,
    orderDate: String(orderDate),
    amount: String(amount),
    currency,
    "productName[]": productName,
    "productPrice[]": String(productPrice),
    "productCount[]": String(productCount),
    clientEmail: user.email,
    clientAccountId: ws.id,
    language,
    returnUrl: `${SITE_URL}/api/billing/wayforpay/return`,
    serviceUrl: `${SITE_URL}/api/billing/wayforpay/callback`,
    ...extra,
  };
  fields.merchantSignature = md5([
    merchantAccount, merchantDomainName, orderReference, orderDate, amount, currency,
    productName, productCount, productPrice,
  ]);
  return { url: PAY_URL, fields };
}

export type WfpCallback = {
  merchantAccount: string;
  orderReference: string;
  merchantSignature: string;
  amount: number | string;
  currency: string;
  authCode?: string;
  cardPan?: string;
  transactionStatus: string;
  reasonCode?: number | string;
  reason?: string;
  email?: string;
  recToken?: string;
};

export function verifyWfpCallback(b: WfpCallback) {
  const expected = md5([
    b.merchantAccount, b.orderReference, b.amount, b.currency, b.authCode ?? "", b.cardPan ?? "",
    b.transactionStatus, b.reasonCode ?? "",
  ]);
  const got = Buffer.from(String(b.merchantSignature ?? ""));
  const exp = Buffer.from(expected);
  return b.merchantAccount === process.env.WAYFORPAY_MERCHANT_ACCOUNT && got.length === exp.length && timingSafeEqual(got, exp);
}

/** Signed answer WayForPay expects, otherwise it keeps retrying for 4 days. */
export function wfpAccept(orderReference: string) {
  const time = Math.floor(Date.now() / 1000);
  return { orderReference, status: "accept", time, signature: md5([orderReference, "accept", time]) };
}

/** Applies a verified callback. Idempotent. */
export async function handleWfpCallback(b: WfpCallback) {
  const approved = b.transactionStatus === "Approved";
  const failed = ["Declined", "Expired", "Refunded", "Voided"].includes(b.transactionStatus);
  const amountMinor = Math.round(Number(b.amount) * 100);

  const payment = await db.payment.findUnique({
    where: { provider_externalId: { provider: "wayforpay", externalId: b.orderReference } },
  });

  if (payment) {
    if (approved) {
      if (!(await markPaidOnce(payment.id))) return "duplicate";
      if (payment.kind === "credits") {
        await addPurchasedCredits(payment.workspaceId, payment.credits ?? 0);
      } else {
        const interval = (payment.interval ?? "month") as Interval;
        await activatePlan(payment.workspaceId, {
          plan: payment.plan as PaidPlan,
          interval,
          provider: "wayforpay",
          periodEnd: addInterval(new Date(), interval),
          wfpRegularRef: b.orderReference,
        });
      }
      return "paid";
    }
    if (failed && payment.status === "pending") {
      await db.payment.update({ where: { id: payment.id }, data: { status: "failed", error: b.reason ?? b.transactionStatus } });
      return "failed";
    }
    return "ignored";
  }

  // Unknown reference: an automatic regular (renewal) charge of an existing subscription.
  // WayForPay builds renewal references from the original one, so match by containment.
  const candidates = await db.workspace.findMany({
    where: { billingProvider: "wayforpay", wfpRegularRef: { not: null } },
    select: { id: true, wfpRegularRef: true },
  });
  const ws = candidates.find((w) => b.orderReference.includes(w.wfpRegularRef!));
  if (!ws) {
    console.warn("[wayforpay] callback for unknown order", b.orderReference, b.transactionStatus);
    return "unknown";
  }
  const created = await db.payment.create({
    data: {
      workspaceId: ws.id,
      provider: "wayforpay",
      externalId: b.orderReference,
      kind: "renewal",
      amount: amountMinor,
      currency: b.currency,
      status: approved ? "pending" : "failed",
      error: approved ? null : b.reason ?? b.transactionStatus,
    },
  });
  if (approved && (await markPaidOnce(created.id))) {
    await extendPeriod(ws.id);
    return "renewed";
  }
  if (failed) await db.workspace.update({ where: { id: ws.id }, data: { billingStatus: "past_due" } });
  return failed ? "renewal_failed" : "ignored";
}

async function regularApi(requestType: "STATUS" | "REMOVE", orderReference: string) {
  const res = await fetch(REGULAR_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestType,
      merchantAccount: process.env.WAYFORPAY_MERCHANT_ACCOUNT,
      merchantPassword: process.env.WAYFORPAY_MERCHANT_PASSWORD,
      orderReference,
    }),
  });
  return (await res.json()) as {
    reasonCode?: number; reason?: string; status?: string;
    lastPayedDate?: number | null; lastPayedStatus?: string | null; nextPaymentDate?: number | null;
  };
}

/** Stops future automatic charges; access stays until the paid period ends. */
export async function cancelWfpSubscription(wfpRegularRef: string) {
  const r = await regularApi("REMOVE", wfpRegularRef);
  if (r.reasonCode !== 4100) throw new Error(`WayForPay: ${r.reason ?? "cancel failed"}`);
}

/**
 * Safety net for missed renewal callbacks: for WayForPay subscriptions whose period ended,
 * ask the regular API whether the last automatic charge succeeded. Called by the worker / cron.
 */
export async function reconcileWfpSubscriptions() {
  if (!wfpConfigured() || !process.env.WAYFORPAY_MERCHANT_PASSWORD) return [];
  const due = await db.workspace.findMany({
    where: {
      billingProvider: "wayforpay",
      wfpRegularRef: { not: null },
      billingStatus: { in: ["active", "past_due"] },
      currentPeriodEnd: { lt: new Date() },
    },
    take: 50,
  });
  const out = [];
  for (const ws of due) {
    try {
      const r = await regularApi("STATUS", ws.wfpRegularRef!);
      const paidAt = r.lastPayedDate ? new Date(r.lastPayedDate * 1000) : null;
      // the renewal charge happens around the end of the period
      const renewalWindowStart = new Date(ws.currentPeriodEnd!.getTime() - 3 * 864e5);
      if (r.lastPayedStatus === "Approved" && paidAt && paidAt > renewalWindowStart) {
        await extendPeriod(ws.id);
        out.push({ id: ws.id, result: "extended" });
      } else if (r.status === "Removed" || r.status === "Suspended" || r.status === "Completed") {
        await db.workspace.update({ where: { id: ws.id }, data: { billingStatus: "canceled" } });
        out.push({ id: ws.id, result: "canceled" });
      } else {
        await db.workspace.update({ where: { id: ws.id }, data: { billingStatus: "past_due" } });
        out.push({ id: ws.id, result: "past_due" });
      }
    } catch (e) {
      out.push({ id: ws.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}
