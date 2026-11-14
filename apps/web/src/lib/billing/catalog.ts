/**
 * Price list. USD is charged by Paddle (international), UAH by WayForPay (Ukrainian cards).
 * Yearly = 10 × monthly (2 months free). Edit prices here; Paddle prices must also exist in the
 * Paddle dashboard and their ids go into the PADDLE_PRICE_* env variables.
 */
export type PaidPlan = "starter" | "pro" | "agency";
export type Interval = "month" | "year";

export const PAID_PLANS: PaidPlan[] = ["starter", "pro", "agency"];

export const PLAN_PRICES: Record<PaidPlan, Record<Interval, { usd: number; uah: number }>> = {
  starter: { month: { usd: 9, uah: 379 }, year: { usd: 90, uah: 3790 } },
  pro: { month: { usd: 19, uah: 799 }, year: { usd: 190, uah: 7990 } },
  agency: { month: { usd: 49, uah: 1990 }, year: { usd: 490, uah: 19900 } },
};

export const CREDIT_PACK = { credits: 100, usd: 5, uah: 199 };
export const MAX_PACKS = 10;

/** Days of access kept after a period ends, while a renewal is being retried. */
export const GRACE_DAYS = 3;

export function addInterval(from: Date, interval: Interval) {
  const d = new Date(from);
  if (interval === "year") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

// ── Paddle price ids (create the prices in Paddle → Catalog, then put ids in env) ──
const PADDLE_ENV_KEYS: Record<string, string> = {
  "starter:month": "PADDLE_PRICE_STARTER_MONTH",
  "starter:year": "PADDLE_PRICE_STARTER_YEAR",
  "pro:month": "PADDLE_PRICE_PRO_MONTH",
  "pro:year": "PADDLE_PRICE_PRO_YEAR",
  "agency:month": "PADDLE_PRICE_AGENCY_MONTH",
  "agency:year": "PADDLE_PRICE_AGENCY_YEAR",
  credits: "PADDLE_PRICE_CREDITS_100",
};

export function paddlePriceIds() {
  const out: Record<string, string> = {};
  for (const [k, env] of Object.entries(PADDLE_ENV_KEYS)) if (process.env[env]) out[k] = process.env[env]!;
  return out;
}

/** Reverse lookup used by webhooks: price id → what was bought. */
export function paddlePriceInfo(priceId: string): { kind: "plan"; plan: PaidPlan; interval: Interval } | { kind: "credits" } | null {
  for (const [k, id] of Object.entries(paddlePriceIds())) {
    if (id !== priceId) continue;
    if (k === "credits") return { kind: "credits" };
    const [plan, interval] = k.split(":") as [PaidPlan, Interval];
    return { kind: "plan", plan, interval };
  }
  return null;
}

export type Currency = "uah" | "usd";

/**
 * What to show on a price card. For yearly plans the headline is the monthly equivalent,
 * with the regular monthly price struck through and the real discount; `total` is what is charged.
 */
export function priceView(plan: PaidPlan, interval: Interval, currency: Currency) {
  const monthly = PLAN_PRICES[plan].month[currency];
  const total = PLAN_PRICES[plan][interval][currency];
  if (interval === "month") return { perMonth: monthly, compareAt: null as number | null, discountPct: 0, total };
  return {
    perMonth: total / 12,
    compareAt: monthly as number | null,
    discountPct: Math.round((1 - total / (monthly * 12)) * 100),
    total,
  };
}

/** Biggest yearly discount across plans, for the "Yearly −17%" toggle label. */
export function maxYearlyDiscount(currency: Currency = "usd") {
  return Math.max(...PAID_PLANS.map((p) => priceView(p, "year", currency).discountPct));
}

export function formatMoney(amount: number, currency: Currency) {
  if (currency === "uah") return `${Math.round(amount).toLocaleString("uk-UA")} ₴`;
  // whole dollars without cents; monthly equivalents like 15.83 keep cents
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
