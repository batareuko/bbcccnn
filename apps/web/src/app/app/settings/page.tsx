"use client";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { setLocaleCookie, useI18n } from "@/i18n/client";
import { useApp } from "@/components/AppContext";
import { formatInTz, listTimeZones } from "@/lib/tz";

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const app = useApp();
  const [name, setName] = useState(app.workspaceName);
  const [tz, setTz] = useState(app.timezone);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [clock, setClock] = useState("");

  const zones = useMemo(() => listTimeZones(), []);
  const shown = zones.filter((z) => z.toLowerCase().includes(filter.toLowerCase()) || z === tz);

  useEffect(() => {
    const tick = () => setClock(formatInTz(new Date(), tz, locale, { dateStyle: "full", timeStyle: "short" }));
    tick();
    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, [tz, locale]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/api/workspace", { method: "PATCH", json: { name, timezone: tz } });
      setMsg(t.settings.saved);
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="narrow">
      <div className="page-head"><h1>{t.settings.title}</h1></div>
      <form className="card stack" onSubmit={save}>
        <h3>{t.settings.workspace}</h3>
        <label>
          {t.settings.wsName}
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          {t.settings.timezone}
          <input placeholder="Kyiv, Warsaw, New_York…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <select size={6} value={tz} onChange={(e) => setTz(e.target.value)}>
            {shown.map((z) => (
              <option key={z} value={z}>{z.replaceAll("_", " ")}</option>
            ))}
          </select>
          <span className="muted small">{t.settings.tzHint}</span>
          <span className="small">{t.settings.now}: <b>{clock}</b></span>
        </label>
        <button className="btn primary">{t.common.save}</button>
        {msg && <p className="notice">{msg}</p>}
      </form>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h3>{t.settings.language}</h3>
        <div className="seg">
          {(["uk", "en"] as const).map((l) => (
            <button
              key={l}
              className={locale === l ? "active" : ""}
              onClick={() => {
                setLocaleCookie(l);
                location.reload();
              }}
            >
              {l === "uk" ? "Українська" : "English"}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h3>✨ {t.credits.balance}</h3>
        <div className="credits-big mono">{app.aiCredits}</div>
        <p className="muted small">{t.credits.hint}</p>
        <a className="btn" href="/app/billing#credits">{t.credits.topup}</a>
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h3>{t.settings.account}</h3>
        <span>{app.email}</span>
        <span className="muted">{t.settings.plan}: <b>{app.plan}</b> · <a href="/app/billing">{t.billing.title} →</a></span>
      </div>

      <DeleteAccount />
    </div>
  );
}

function DeleteAccount() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(t.settings.deleteConfirm)) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/account", { method: "DELETE", json: { password } });
      location.href = locale === "en" ? "/en" : "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="card stack danger-zone" style={{ marginTop: 16 }}>
      <h3>{t.settings.deleteTitle}</h3>
      <p className="muted small" style={{ margin: 0 }}>
        {t.settings.deleteHint}{" "}
        <a href={locale === "en" ? "/en/legal/data-deletion" : "/legal/data-deletion"} target="_blank">{t.settings.deleteMore}</a>
      </p>
      {!open ? (
        <button className="btn ghost danger" onClick={() => setOpen(true)}>{t.settings.deleteTitle}</button>
      ) : (
        <form className="stack" onSubmit={remove}>
          <label>
            {t.auth.password}
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="btn danger" disabled={busy}>{t.settings.deleteForever}</button>
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>{t.common.cancel}</button>
          </div>
        </form>
      )}
    </div>
  );
}
