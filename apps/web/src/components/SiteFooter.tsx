import Link from "next/link";
import type { Locale } from "@/i18n/dict";
import { legalVars } from "@/legal/vars";

const LABELS = {
  uk: { terms: "Публічна оферта", privacy: "Конфіденційність", refund: "Повернення коштів", deletion: "Видалення даних", made: "Зроблено в Україні 🇺🇦", taxId: "РНОКПП" },
  en: { terms: "Terms", privacy: "Privacy", refund: "Refunds", deletion: "Data deletion", made: "Made in Ukraine 🇺🇦", taxId: "Tax ID" },
};

/** Public footer with legal links and business details (required by payment providers and Meta review). */
export function SiteFooter({ locale }: { locale: Locale }) {
  const l = LABELS[locale];
  const v = legalVars();
  const base = locale === "en" ? "/en/legal" : "/legal";
  return (
    <footer className="l-footer">
      <div className="footer-top">
        <span className="brand"><span className="logo-dot" />{v.brand}</span>
        <nav className="footer-links">
          <Link href={`${base}/terms`}>{l.terms}</Link>
          <Link href={`${base}/privacy`}>{l.privacy}</Link>
          <Link href={`${base}/refund`}>{l.refund}</Link>
          <Link href={`${base}/data-deletion`}>{l.deletion}</Link>
        </nav>
        <div className="row">
          <Link href="/">Українська</Link>
          <Link href="/en">English</Link>
        </div>
      </div>
      <div className="footer-legal muted small">
        © {new Date().getFullYear()} {v.legalName} · {l.taxId} {v.taxId} · {v.address} ·{" "}
        <a href={`mailto:${v.email}`}>{v.email}</a> · {l.made}
      </div>
    </footer>
  );
}
