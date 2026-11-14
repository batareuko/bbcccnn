"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { LangSwitch, setLocaleCookie, useI18n } from "@/i18n/client";

export function LoginForm({ initialMode }: { initialMode: "login" | "register" }) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setLocaleCookie(locale), [locale]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api(`/api/auth/${mode}`, { method: "POST", json: { email, password, timezone } });
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-top">
        <Link href={locale === "en" ? "/en" : "/"} className="brand"><span className="logo-dot" />PostFlow</Link>
        <LangSwitch />
      </div>
      <form className="card auth-card" onSubmit={submit}>
        <h1>{mode === "login" ? t.auth.login : t.auth.register}</h1>
        <p className="muted">{t.auth.tagline}</p>
        <label>
          {t.auth.email}
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {t.auth.password}
          <input
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary big" disabled={busy}>
          {mode === "login" ? t.auth.login : t.auth.register}
        </button>
        {mode === "register" && (
          <p className="terms-note">
            {locale === "en" ? "By creating an account you accept the " : "Створюючи акаунт, ви приймаєте "}
            <a href={locale === "en" ? "/en/legal/terms" : "/legal/terms"} target="_blank">{locale === "en" ? "Terms" : "Публічну оферту"}</a>
            {locale === "en" ? " and " : " та "}
            <a href={locale === "en" ? "/en/legal/privacy" : "/legal/privacy"} target="_blank">{locale === "en" ? "Privacy Policy" : "Політику конфіденційності"}</a>.
          </p>
        )}
        <button type="button" className="btn ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? t.auth.toRegister : t.auth.toLogin}
        </button>
      </form>
    </div>
  );
}
