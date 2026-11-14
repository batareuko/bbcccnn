/**
 * Paddle Billing (international cards, PayPal, Apple/Google Pay; Paddle is merchant of record and handles VAT).
 * Checkout runs client-side with Paddle.js; state changes arrive via webhooks signed with `Paddle-Signature`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { CREDIT_PACK, paddlePriceIds, paddlePriceInfo } from "./catalog";
import { activatePlan, addPurchasedCredits, markPaidOnce } from "./service";

const sandbox = () => process.env.PADDLE_ENV !== "production";
const apiBase = () => (sandbox() ? "https://sandbox-api.paddle.com" : "https://api.paddle.com");

export function paddleConfigured() {
  return !!(process.env.PADDLE_CLIENT_TOKEN && process.env.PADDLE_WEBHOOK_SECRET);
}

/** What the browser needs to open Paddle checkout. */
export function paddleClientConfig() {
  return paddleConfigured()
    ? { token: process.env.PADDLE_CLIENT_TOKEN!, environment: sandbox() ? "sandbox" : "production", prices: paddlePriceIds() }
    : null;
}

/** Verifies `Paddle-Signature: ts=...;h1=...` = HMAC-SHA256(secret, `${ts}:${rawBody}`). */
export function verifyPaddleSignature(rawBody: string, header: string | null, toleranceSec = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(";").map((p) => p.split("=") as [string, string]));
  const ts = parts.ts;
  const sigs = header
    .split(";")
    .filter((p) => p.startsWith("h1="))
    .map((p) => p.slice(3));
  if (!ts || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > toleranceSec) return false;
  const expected = createHmac("sha256", process.env.PADDLE_WEBHOOK_SECRET ?? "").update(`${ts}:${rawBody}`).digest("hex");
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}

type PaddleEvent = {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: Record<string, any>;
};

async function workspaceFor(data: Record<string, any>) {
  const wsId = data.custom_data?.workspaceId as string | undefined;
  if (wsId) {
    const ws = await db.workspace.findUnique({ where: { id: wsId } });
    if (ws) return ws;
  }
  const subId = (data.subscription_id ?? (String(data.id).startsWith("sub_") ? data.id : null)) as string | null;
  return subId ? db.workspace.findUnique({ where: { paddleSubscriptionId: subId } }) : null;
}

export async function handlePaddleEvent(ev: PaddleEvent) {
  const d = ev.data;
  const ws = await workspaceFor(d);
  if (!ws) {
    console.warn("[paddle] no workspace for", ev.event_type, d.id);
    return "unknown";
  }

  // ── payments (first purchase, renewals, credit packs) ──
  if (ev.event_type === "transaction.completed" || ev.event_type === "transaction.paid") {
    const items = (d.items ?? []) as { price?: { id?: string }; quantity?: number }[];
    const infos = items.map((it) => ({ info: it.price?.id ? paddlePriceInfo(it.price.id) : null, qty: it.quantity ?? 1 }));
    const credits = infos.filter((x) => x.info?.kind === "credits").reduce((n, x) => n + x.qty * CREDIT_PACK.credits, 0);
    const planItem = infos.find((x) => x.info?.kind === "plan")?.info as { plan: string; interval: string } | undefined;
    const total = Number(d.details?.totals?.total ?? 0);

    const payment = await db.payment.upsert({
      where: { provider_externalId: { provider: "paddle", externalId: d.id } },
      create: {
        workspaceId: ws.id,
        provider: "paddle",
        externalId: d.id,
        kind: credits ? "credits" : d.origin === "subscription_recurring" ? "renewal" : "subscription",
        plan: planItem?.plan ?? null,
        interval: planItem?.interval ?? null,
        credits: credits || null,
        amount: Number.isFinite(total) ? total : 0,
        currency: d.currency_code ?? "USD",
      },
      update: {},
    });
    if (!(await markPaidOnce(payment.id))) return "duplicate";
    if (credits) await addPurchasedCredits(ws.id, credits);
    return "paid";
  }

  // ── subscription state ──
  if (ev.event_type.startsWith("subscription.")) {
    const occurred = new Date(ev.occurred_at);
    if (ws.billingUpdatedAt && ws.billingUpdatedAt > occurred) return "stale";
    const priceId = d.items?.[0]?.price?.id as string | undefined;
    const info = priceId ? paddlePriceInfo(priceId) : null;
    const periodEnd = d.current_billing_period?.ends_at ? new Date(d.current_billing_period.ends_at) : null;

    if (d.status === "active" || d.status === "trialing") {
      if (!info || info.kind !== "plan") {
        console.warn("[paddle] unknown price on subscription", priceId);
        return "unknown_price";
      }
      await activatePlan(ws.id, {
        plan: info.plan,
        interval: info.interval,
        provider: "paddle",
        periodEnd: periodEnd ?? new Date(Date.now() + 31 * 864e5),
        paddleSubscriptionId: d.id,
        paddleCustomerId: d.customer_id,
      });
      await db.workspace.update({
        where: { id: ws.id },
        data: { cancelAtPeriodEnd: d.scheduled_change?.action === "cancel", billingUpdatedAt: occurred },
      });
      return "active";
    }
    if (d.status === "past_due") {
      await db.workspace.update({ where: { id: ws.id }, data: { billingStatus: "past_due", billingUpdatedAt: occurred } });
      return "past_due";
    }
    if (d.status === "canceled" || d.status === "paused") {
      await db.workspace.update({
        where: { id: ws.id },
        data: {
          billingStatus: "canceled",
          cancelAtPeriodEnd: false,
          // access ends now (Paddle already let the paid period run out, or it was canceled immediately)
          currentPeriodEnd: new Date(),
          billingUpdatedAt: occurred,
        },
      });
      return "canceled";
    }
  }
  return "ignored";
}

/** Cancels at the end of the paid period. */
export async function cancelPaddleSubscription(subscriptionId: string) {
  const res = await fetch(`${apiBase()}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.PADDLE_API_KEY ?? ""}` },
    body: JSON.stringify({ effective_from: "next_billing_period" }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: { detail?: string } };
    throw new Error(`Paddle: ${j.error?.detail ?? res.status}`);
  }
}
