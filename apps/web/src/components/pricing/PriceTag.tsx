import { formatMoney, priceView, type Currency, type Interval, type PaidPlan } from "@/lib/billing/catalog";

export type PriceLabels = { perMonth: string; billedYearly: string; billedMonthly: string };

/**
 * Headline is always the price per month. For yearly plans it also shows the regular monthly
 * price struck through, the real discount, and the yearly total that will actually be charged.
 */
export function PriceTag({
  plan,
  interval,
  currency,
  labels,
}: {
  plan: PaidPlan;
  interval: Interval;
  currency: Currency;
  labels: PriceLabels;
}) {
  const v = priceView(plan, interval, currency);
  return (
    <div className="price-tag">
      <div className="price">
        {formatMoney(v.perMonth, currency)}
        <span>{labels.perMonth}</span>
      </div>
      <div className="price-compare">
        {v.compareAt !== null ? (
          <>
            <s>{formatMoney(v.compareAt, currency)}</s>
            <span className="discount">−{v.discountPct}%</span>
          </>
        ) : (
          <span aria-hidden>{" "}</span>
        )}
      </div>
      <div className="price-total muted small">
        {(interval === "year" ? labels.billedYearly : labels.billedMonthly).replace("{total}", formatMoney(v.total, currency))}
      </div>
    </div>
  );
}
