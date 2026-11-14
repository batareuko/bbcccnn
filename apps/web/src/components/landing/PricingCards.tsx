"use client";
import Link from "next/link";
import { useState } from "react";
import { maxYearlyDiscount, type Currency, type Interval, type PaidPlan } from "@/lib/billing/catalog";
import { PriceTag } from "@/components/pricing/PriceTag";

type Plan = { id: string; name: string; items: string[]; cta: string; featured?: boolean };

/** Landing pricing with a month / year toggle. Yearly shows the monthly equivalent + real discount. */
export function PricingCards({
  plans,
  currency,
  signup,
  labels,
}: {
  plans: readonly Plan[];
  currency: Currency;
  signup: string;
  labels: { monthly: string; yearly: string; perMonth: string; billedYearly: string; billedMonthly: string; popular: string };
}) {
  const [interval, setInterval_] = useState<Interval>("year");
  return (
    <>
      <div className="pricing-toggle">
        <div className="seg">
          <button className={interval === "month" ? "active" : ""} onClick={() => setInterval_("month")}>{labels.monthly}</button>
          <button className={interval === "year" ? "active" : ""} onClick={() => setInterval_("year")}>
            {labels.yearly} <span className="save">−{maxYearlyDiscount(currency)}%</span>
          </button>
        </div>
      </div>
      <div className="pricing">
        {plans.map((p) => (
          <div key={p.id} className={`plan ${p.featured ? "featured" : ""}`}>
            {p.featured && <span className="pill small">{labels.popular}</span>}
            <h3>{p.name}</h3>
            <PriceTag plan={p.id as PaidPlan} interval={interval} currency={currency} labels={labels} />
            <ul>
              {p.items.map((it) => (
                <li key={it}>✓ {it}</li>
              ))}
            </ul>
            <Link href={signup} className={`btn ${p.featured ? "primary" : ""}`}>{p.cta}</Link>
          </div>
        ))}
      </div>
    </>
  );
}
