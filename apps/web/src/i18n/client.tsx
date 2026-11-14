"use client";
import { createContext, useContext } from "react";
import { DICTS, LOCALE_COOKIE, type Locale } from "./dict";

const Ctx = createContext<Locale>("uk");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const locale = useContext(Ctx);
  return { locale, t: DICTS[locale] };
}

export function setLocaleCookie(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

export function LangSwitch({ className = "" }: { className?: string }) {
  const { locale } = useI18n();
  return (
    <div className={`lang ${className}`}>
      {(["uk", "en"] as const).map((l) => (
        <button
          key={l}
          className={l === locale ? "active" : ""}
          onClick={() => {
            setLocaleCookie(l);
            location.reload();
          }}
        >
          {l === "uk" ? "UA" : "EN"}
        </button>
      ))}
    </div>
  );
}
