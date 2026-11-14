"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { useApp } from "@/components/AppContext";
import { formatInTz } from "@/lib/tz";
import { formatMoney, maxYearlyDiscount, priceView, type Currency } from "@/lib/billing/catalog";
import { PriceTag } from "@/components/pricing/PriceTag";

type Interval = "month" | "year";
type PlanId = "starter" | "pro" | "agency";
type Billing = {
  workspaceId: string;
  email: string;
  plan: string;
  storedPlan: string;
  trialDaysLeft: number | null;
  billing: { provider: string | null; interval: Interval | null; status: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean };
  aiCredits: number;
  catalog: {
    plans: Record<PlanId, Record<Interval, { usd: number; uah: number }>>;
    creditPack: { credits: number; usd: number; uah: number };
    maxPacks: number;
  };
  providers: { wayforpay: boolean; paddle: { token: string; environment: string; prices: Record<string, string> } | null };
  payments: { id: string; provider: string; kind: string; plan: string | null; interval: string | null; credits: number | null; amount: number; currency: string; status: string; error: string | null; date: string }[];
};

declare global {
  interface Window {
    Paddle?: {
      Environment: { set(env: string): void };
      Initialize(opts: { token: string; eventCallback?: (e: { name?: string }) => void }): void;
      Checkout: { open(opts: Record<string, unknown>): void };
    };
  }
}

/** Loads Paddle.js v2 once. */
function loadPaddle(cfg: NonNullable<Billing["providers"]["paddle"]>, onDone: () => void) {
  return new Promise<void>((resolve, reject) => {
    if (window.Paddle) return resolve();
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.onload = () => {
      if (cfg.environment === "sandbox") window.Paddle!.Environment.set("sandbox");
      window.Paddle!.Initialize({
        token: cfg.token,
        eventCallback: (e) => e.name === "checkout.completed" && onDone(),
      });
      resolve();
    };
    s.onerror = () => reject(new Error("Paddle.js failed to load"));
    document.head.appendChild(s);
  });
}

/** POSTs the signed WayForPay form (WayForPay needs a real form submit, not fetch). */
function submitForm(url: string, fields: Record<string, string>) {
  const f = document.createElement("form");
  f.method = "POST";
  f.action = url;
  f.acceptCharset = "utf-8";
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}

const PLAN_LABEL: Record<string, string> = { starter: "Starter", pro: "Pro", agency: "Agency", trial: "Trial", expired: "—" };

export default function BillingPage() {
  const { t, locale } = useI18n();
  const tb = t.billing;
  const { timezone: tz } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<Billing | null>(null);
  const [interval, setInterval_] = useState<Interval>("month");
  const [method, setMethod] = useState<"wayforpay" | "paddle">(locale === "uk" ? "wayforpay" : "paddle");
  const [packs, setPacks] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState(params.get("returned") ? tb.returned : "");

  const load = useCallback(async () => {
    const d = await api<Billing>("/api/billing");
    setData(d);
    if (d.billing.interval) setInterval_(d.billing.interval);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // after returning from a payment, poll a few times so the new plan shows up without a manual refresh
  useEffect(() => {
    if (!msg) return;
    let n = 0;
    const i = setInterval(() => {
      load();
      router.refresh();
      if (++n >= 6) clearInterval(i);
    }, 5000);
    return () => clearInterval(i);
  }, [msg, load, router]);

  if (!data) return <p className="muted">{t.common.loading}</p>;
  // WayForPay charges in UAH, Paddle in USD
  const currency: Currency = method === "wayforpay" ? "uah" : "usd";
  const paddle = data.providers.paddle;
  const methodReady = method === "wayforpay" ? data.providers.wayforpay : !!paddle;

  async function buy(item: { kind: "plan"; plan: PlanId } | { kind: "credits" }) {
    const key = item.kind === "plan" ? item.plan : "credits";
    setBusy(key);
    setMsg("");
    try {
      if (method === "wayforpay") {
        const body = item.kind === "plan" ? { kind: "plan", plan: item.plan, interval } : { kind: "credits", packs };
        const r = await api<{ url: string; fields: Record<string, string> }>("/api/billing/wayforpay/checkout", { method: "POST", json: body });
        submitForm(r.url, r.fields);
        return;
      }
      if (!paddle) throw new Error(tb.notConfigured);
      const priceId = item.kind === "plan" ? paddle.prices[`${item.plan}:${interval}`] : paddle.prices.credits;
      if (!priceId) throw new Error(tb.notConfigured);
      await loadPaddle(paddle, () => setMsg(tb.returned));
      window.Paddle!.Checkout.open({
        items: [{ priceId, quantity: item.kind === "credits" ? packs : 1 }],
        customer: { email: data!.email },
        customData:
          item.kind === "plan"
            ? { workspaceId: data!.workspaceId, kind: "plan", plan: item.plan, interval }
            : { workspaceId: data!.workspaceId, kind: "credits", packs },
        settings: {
          displayMode: "overlay",
          locale: locale === "uk" ? "uk" : "en",
          theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
          successUrl: `${location.origin}/app/billing?returned=1`,
        },
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!confirm(tb.cancelConfirm)) return;
    setBusy("cancel");
    try {
      await api("/api/billing/cancel", { method: "POST" });
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const b = data.billing;
  const paid = ["starter", "pro", "agency"].includes(data.plan) && b.status;
  const fmt = (d: string) => formatInTz(d, tz, locale, { day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      <div className="page-head"><h1>{tb.title}</h1></div>
      {msg && <p className="notice">{msg}</p>}

      <section className="card billing-current">
        <div>
          <span className="muted small">{tb.current}</span>
          <div className="billing-plan">{data.plan === "expired" && data.storedPlan !== "trial" ? PLAN_LABEL[data.storedPlan] : PLAN_LABEL[data.plan] ?? data.plan}</div>
          {data.plan === "trial" && data.trialDaysLeft !== null && <span>{tb.trialLeft.replace("{n}", String(data.trialDaysLeft))}</span>}
          {data.plan === "expired" && <span className="error">{data.storedPlan === "trial" ? tb.expired : tb.subEnded}</span>}
          {paid && b.currentPeriodEnd && (
            <span>
              {b.cancelAtPeriodEnd || b.status === "canceled" ? tb.ends : tb.renews}: <b>{fmt(b.currentPeriodEnd)}</b>
              {b.interval && <span className="muted"> · {b.interval === "year" ? tb.yearly : tb.monthly} · {b.provider === "paddle" ? "Paddle" : "WayForPay"}</span>}
            </span>
          )}
          {b.status === "past_due" && <span className="error">{tb.pastDue}</span>}
          {b.cancelAtPeriodEnd && <span className="muted">{tb.canceled}</span>}
        </div>
        <div className="billing-side">
          <div className="muted small">✨ {t.credits.balance}</div>
          <div className="credits-big mono">{data.aiCredits}</div>
          {paid && !b.cancelAtPeriodEnd && b.status !== "canceled" && (
            <button className="btn ghost danger" disabled={busy === "cancel"} onClick={cancel}>{tb.cancel}</button>
          )}
        </div>
      </section>

      <div className="billing-controls">
        <div className="seg">
          <button className={interval === "month" ? "active" : ""} onClick={() => setInterval_("month")}>{tb.monthly}</button>
          <button className={interval === "year" ? "active" : ""} onClick={() => setInterval_("year")}>
            {tb.yearly} <span className="save">−{maxYearlyDiscount(currency)}%</span>
          </button>
        </div>
        <div className="methods">
          {(["wayforpay", "paddle"] as const).map((m) => (
            <label key={m} className={`method ${method === m ? "on" : ""}`}>
              <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
              <b>{m === "wayforpay" ? "🇺🇦 " + tb.wfp : "🌍 " + tb.paddle}</b>
              <span className="muted small">{m === "wayforpay" ? tb.wfpSub : tb.paddleSub}</span>
            </label>
          ))}
        </div>
      </div>
      {!methodReady && <p className="notice">{tb.notConfigured}</p>}
      <label className="consent">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>
          {tb.consentA}{" "}
          <a href={locale === "en" ? "/en/legal/terms" : "/legal/terms"} target="_blank">{tb.consentTerms}</a>{" "}
          {tb.consentB}{" "}
          <a href={locale === "en" ? "/en/legal/refund" : "/legal/refund"} target="_blank">{tb.consentRefund}</a>
          {tb.consentC}
        </span>
      </label>

      <div className="pricing billing-plans">
        {(["starter", "pro", "agency"] as const).map((id) => {
          const total = priceView(id, interval, currency).total;
          const isCurrent = data.plan === id && b.interval === interval && b.status === "active";
          return (
            <div key={id} className={`plan ${id === "pro" ? "featured" : ""}`}>
              {isCurrent && <span className="pill small">{tb.currentBadge}</span>}
              <h3>{PLAN_LABEL[id]}</h3>
              <PriceTag plan={id} interval={interval} currency={currency} labels={tb} />
              <ul>
                {tb.planItems[id].map((x) => (
                  <li key={x}>✓ {x}</li>
                ))}
              </ul>
              <button
                className={`btn ${id === "pro" ? "primary" : ""}`}
                disabled={!!busy || !methodReady || isCurrent || !agreed}
                onClick={() => buy({ kind: "plan", plan: id })}
              >
                {busy === id ? t.common.loading : isCurrent ? tb.currentBadge : tb.pay.replace("{total}", formatMoney(total, currency))}
              </button>
            </div>
          );
        })}
      </div>

      <section id="credits" className="card credit-pack">
        <div>
          <h3>✨ {tb.creditsTitle}</h3>
          <p className="muted small">{tb.creditsSub.replace("{c}", String(data.catalog.creditPack.credits))} {t.credits.hint}</p>
        </div>
        <div className="row">
          <select value={packs} onChange={(e) => setPacks(+e.target.value)} style={{ width: "auto" }}>
            {Array.from({ length: data.catalog.maxPacks }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n * data.catalog.creditPack.credits} ✨</option>
            ))}
          </select>
          <b className="mono">
            {method === "wayforpay"
              ? `${(data.catalog.creditPack.uah * packs).toLocaleString("uk-UA")} ₴`
              : `$${data.catalog.creditPack.usd * packs}`}
          </b>
          <button className="btn accent" disabled={!!busy || !methodReady || !agreed} title={agreed ? undefined : tb.consentNeeded} onClick={() => buy({ kind: "credits" })}>
            {busy === "credits" ? t.common.loading : tb.buy}
          </button>
        </div>
      </section>

      <section className="stack" style={{ marginTop: 24 }}>
        <h3>{tb.history}</h3>
        {data.payments.length === 0 ? (
          <div className="card empty">{tb.noPayments}</div>
        ) : (
          <div className="card table-wrap">
            <table className="table">
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="mono small">{fmt(p.date)}</td>
                    <td>
                      {tb.kinds[p.kind] ?? p.kind}
                      {p.plan && ` · ${PLAN_LABEL[p.plan]}`}
                      {p.credits ? ` · ${p.credits} ✨` : ""}
                    </td>
                    <td className="muted small">{p.provider === "paddle" ? "Paddle" : "WayForPay"}</td>
                    <td className="mono">{p.amount.toLocaleString(locale === "uk" ? "uk-UA" : "en-US")} {p.currency}</td>
                    <td><span className={`badge status-${p.status === "paid" ? "published" : "failed"}`}>{tb.statuses[p.status] ?? p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
