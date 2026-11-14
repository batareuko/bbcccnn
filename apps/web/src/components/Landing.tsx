import Link from "next/link";
import { DICTS, type Locale } from "@/i18n/dict";
import { PixelField } from "./landing/PixelField";
import { PixelMorph } from "./landing/PixelMorph";
import { Scramble } from "./landing/Scramble";
import { RevealOnScroll } from "./landing/Reveal";
import { PricingCards } from "./landing/PricingCards";
import { PLAN_PRICES, type Currency, type PaidPlan } from "@/lib/billing/catalog";

const MORPH = { uk: ["ПЛАНУЙ", "ПУБЛІКУЙ", "РОСТИ"], en: ["PLAN", "POST", "GROW"] };
const TICKER = {
  uk: [
    ["#0ea5e9", "Telegram", "Опубліковано · 09:00"], ["#ec4899", "Instagram", "Карусель · 12:30"], ["#6366f1", "Facebook", "Анонс · 18:00"],
    ["#10b981", "WordPress → Telegram", "Автопост · 10:02"], ["#8b5cf6", "AI", "3 версії тексту за 4 с"], ["#f59e0b", "RSS → Facebook", "Новина · 15:45"],
  ],
  en: [
    ["#0ea5e9", "Telegram", "Published · 09:00"], ["#ec4899", "Instagram", "Carousel · 12:30"], ["#6366f1", "Facebook", "Launch post · 18:00"],
    ["#10b981", "WordPress → Telegram", "Auto-post · 10:02"], ["#8b5cf6", "AI", "3 versions in 4s"], ["#f59e0b", "RSS → Facebook", "News · 15:45"],
  ],
} as const;

const DEMO = [
  { d: 3, items: [["09:00", "#0ea5e9", "Анонс вебінару"]] },
  { d: 5, items: [["12:30", "#ec4899", "Reels: бекстейдж"], ["18:00", "#6366f1", "Дайджест тижня"]] },
  { d: 9, items: [["10:00", "#10b981", "Нова стаття в блозі"]] },
  { d: 12, items: [["15:00", "#f59e0b", "Кейс клієнта"]] },
  { d: 16, items: [["11:00", "#6366f1", "Опитування"], ["19:30", "#ec4899", "Каруселька"]] },
  { d: 18, items: [["09:30", "#0ea5e9", "Новини продукту"]] },
  { d: 23, items: [["13:00", "#10b981", "Автопост з WP"]] },
  { d: 26, items: [["17:00", "#f59e0b", "Знижка −20%"]] },
] as const;
const DEMO_EN = ["Webinar teaser", "Reels: backstage", "Weekly digest", "New blog article", "Customer story", "Poll", "Carousel", "Product news", "Auto-post from WP", "20% off sale"];

export function Landing({ locale }: { locale: Locale }) {
  const t = DICTS[locale].landing;
  // Ukrainian visitors pay in UAH (WayForPay), everyone else in USD (Paddle)
  const currency: Currency = locale === "uk" ? "uah" : "usd";
  const other = locale === "uk" ? { href: "/en", label: "EN" } : { href: "/", label: "UA" };
  const login = `/login?lang=${locale}`;
  const signup = `/login?lang=${locale}&mode=register`;
  let n = 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PostFlow",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    description: t.metaDesc,
    inLanguage: locale,
    offers: t.plans.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: PLAN_PRICES[p.id as PaidPlan].month[currency],
      priceCurrency: currency.toUpperCase(),
    })),
  };

  return (
    <div className="landing" lang={locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="l-nav">
        <Link href={locale === "en" ? "/en" : "/"} className="brand"><span className="logo-dot" />PostFlow</Link>
        <nav>
          <a href="#features">{locale === "uk" ? "Можливості" : "Features"}</a>
          <a href="#how">{t.howTitle}</a>
          <a href="#pricing">{locale === "uk" ? "Ціни" : "Pricing"}</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="row">
          <Link href={other.href} className="btn ghost small-btn">{other.label}</Link>
          <Link href={login} className="btn ghost">{t.login}</Link>
          <Link href={signup} className="btn primary">{t.ctaPrimary}</Link>
        </div>
      </header>

      <RevealOnScroll />
      <section className="hero">
        <PixelField />
        <div className="hero-glow" />
        <span className="pill">{t.badge}</span>
        <h1>
          <Scramble text={t.h1a} />
          <br />
          <Scramble className="grad" text={t.h1b} delay={350} />
        </h1>
        <p className="lead">{t.lead}</p>
        <div className="row center">
          <Link href={signup} className="btn primary big">{t.ctaPrimary} →</Link>
          <a href="#how" className="btn big">{t.ctaSecondary}</a>
        </div>
        <p className="muted small">{t.noCard}</p>

        <PixelMorph words={MORPH[locale]} />

        <div className="mock" aria-hidden>
          <div className="mock-bar"><i /><i /><i /><span>app.postflow · {locale === "uk" ? "Календар" : "Calendar"}</span></div>
          <div className="mock-cal">
            {DICTS[locale].calendar.weekdays.map((w) => (
              <div key={w} className="mock-wd">{w}</div>
            ))}
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => {
              const day = DEMO.find((x) => x.d === d);
              return (
                <div key={d} className={`mock-day ${d === 12 ? "today" : ""}`}>
                  <span>{d}</span>
                  {day?.items.map(([time, color, label]) => {
                    const text = locale === "uk" ? label : DEMO_EN[n];
                    n++;
                    return (
                      <div key={time} className="mock-chip" style={{ "--c": color, "--i": n } as React.CSSProperties}>
                        <b>{time}</b> {text}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="mock-ai">
            <b>✨ AI</b>
            <div className="mock-ai-row"><span className="dot" style={{ "--c": "#0ea5e9" } as React.CSSProperties} />Telegram — {locale === "uk" ? "коротко, з емодзі 🚀" : "short, with emoji 🚀"}</div>
            <div className="mock-ai-row"><span className="dot" style={{ "--c": "#6366f1" } as React.CSSProperties} />Facebook — {locale === "uk" ? "гачок + заклик до дії" : "hook + call to action"}</div>
            <div className="mock-ai-row"><span className="dot" style={{ "--c": "#ec4899" } as React.CSSProperties} />Instagram — #hashtags · link in bio</div>
          </div>
        </div>
      </section>

      <div className="ticker" aria-hidden>
        <div className="ticker-track">
          {[...TICKER[locale], ...TICKER[locale]].map(([c, net, ev], i) => (
            <span key={i} className="tick" style={{ "--c": c } as React.CSSProperties}>
              <span className="dot" /> <b>{net}</b> <span className="muted">{ev}</span> <span className="ok">✓</span>
            </span>
          ))}
        </div>
      </div>

      <section id="features" className="l-section reveal">
        <h2>{t.featuresTitle}</h2>
        <div className="features">
          {t.features.map((f, i) => (
            <div key={f.t} className="feature reveal" style={{ "--d": `${i * 70}ms` } as React.CSSProperties}>
              <span className="f-icon">{f.icon}</span>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="l-section reveal">
        <h2>{t.howTitle}</h2>
        <ol className="steps">
          {t.steps.map((s, i) => (
            <li key={s.t}>
              <span className="step-n">{i + 1}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="l-section reveal">
        <h2>{t.pricingTitle}</h2>
        <p className="muted center-text">{t.pricingSub}</p>
        <PricingCards
          plans={t.plans}
          currency={currency}
          signup={signup}
          labels={{
            monthly: t.monthly,
            yearly: t.yearly,
            perMonth: t.perMonth,
            billedYearly: t.billedYearly,
            billedMonthly: t.billedMonthly,
            popular: t.popular,
          }}
        />
        <div className="ai-addon">
          <div>
            <h3>{t.aiAddon.t}</h3>
            <p className="muted">{t.aiAddon.d}</p>
          </div>
          <b className="mono">{t.aiAddon.price}</b>
        </div>
      </section>

      <section id="faq" className="l-section narrow reveal">
        <h2>{t.faqTitle}</h2>
        {t.faq.map((f) => (
          <details key={f.q} className="faq">
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <section className="final reveal">
        <h2>{t.finalTitle}</h2>
        <Link href={signup} className="btn primary big">{t.finalCta} →</Link>
      </section>

      <footer className="l-footer">
        <span className="brand"><span className="logo-dot" />PostFlow</span>
        <span className="muted">© {new Date().getFullYear()} · {t.footer}</span>
        <div className="row">
          <Link href="/">Українська</Link>
          <Link href="/en">English</Link>
        </div>
      </footer>
    </div>
  );
}
