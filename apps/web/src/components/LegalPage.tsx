import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/dict";
import { LEGAL, LEGAL_DOCS, type LegalDocId } from "@/legal/content";
import { fill } from "@/legal/vars";
import { BRAND } from "@/lib/site";
import { SiteFooter } from "./SiteFooter";

const UPDATED = "2026-11-14";

export function legalMetadata(locale: Locale, doc: string): Metadata {
  if (!LEGAL_DOCS.includes(doc as LegalDocId)) return {};
  const d = LEGAL[locale][doc as LegalDocId];
  return {
    title: d.title,
    alternates: { canonical: `${locale === "en" ? "/en" : ""}/legal/${doc}`, languages: { uk: `/legal/${doc}`, en: `/en/legal/${doc}` } },
  };
}

export function LegalPage({ locale, doc }: { locale: Locale; doc: string }) {
  if (!LEGAL_DOCS.includes(doc as LegalDocId)) notFound();
  const d = LEGAL[locale][doc as LegalDocId];
  const other = locale === "en" ? { href: `/legal/${doc}`, label: "UA" } : { href: `/en/legal/${doc}`, label: "EN" };
  return (
    <div className="landing" lang={locale}>
      <header className="l-nav">
        <Link href={locale === "en" ? "/en" : "/"} className="brand"><span className="logo-dot" />{BRAND}</Link>
        <Link href={other.href} className="btn ghost small-btn">{other.label}</Link>
      </header>
      <article className="legal">
        <h1>{d.title}</h1>
        <p className="muted small">{locale === "en" ? "Last updated" : "Редакція від"}: {UPDATED}</p>
        {d.intro && <p className="legal-intro">{fill(d.intro)}</p>}
        {d.sections.map((s) => (
          <section key={s.h}>
            <h2>{fill(s.h)}</h2>
            {s.p.map((p, i) => (
              <p key={i}>{fill(p)}</p>
            ))}
          </section>
        ))}
      </article>
      <SiteFooter locale={locale} />
    </div>
  );
}
