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
    </div>
  );
}
