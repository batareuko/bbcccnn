"use client";
import { useCallback, useEffect, useState } from "react";
import { TelegramConnect } from "@/components/TelegramConnect";
import { api, type Channel, type Platform } from "@/lib/client";
import { useI18n } from "@/i18n/client";

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"];

export default function ChannelsPage() {
  const { t } = useI18n();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [form, setForm] = useState({ platform: "telegram", name: "", externalId: "", accessToken: "", color: COLORS[0] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [tgBot, setTgBot] = useState(false);
  const load = useCallback(() => api<Channel[]>("/api/channels").then(setChannels), []);
  useEffect(() => {
    load();
    api<Platform[]>("/api/platforms").then(setPlatforms);
    api<{ enabled: boolean }>("/api/telegram").then((r) => setTgBot(r.enabled)).catch(() => {});
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/channels", { method: "POST", json: form });
      setForm((f) => ({ ...f, name: "", externalId: "", accessToken: "", color: COLORS[(channels.length + 1) % COLORS.length] }));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t.common.confirmDelete)) return;
    await api(`/api/channels/${id}`, { method: "DELETE" });
    load();
  }

  const label = (p: string) => platforms.find((x) => x.platform === p)?.label ?? p;

  return (
    <div>
      <div className="page-head"><h1>{t.channels.title}</h1></div>
      <p className="muted">{t.channels.subtitle}</p>
      <div className="two-col">
        <div className="list">
          {channels.length === 0 && <div className="card empty">{t.channels.none}</div>}
          {channels.map((c) => (
            <div key={c.id} className="card list-item" style={{ "--c": c.color } as React.CSSProperties}>
              <span className="dot big" />
              <div className="list-body">
                <b>{c.name}</b>
                <span className="muted small">{label(c.platform)} · {c.externalId}</span>
              </div>
              {c.status === "disconnected" && <span className="badge status-failed" title={t.telegram.disconnectedHint}>{t.telegram.disconnected}</span>}
              <button className="btn ghost danger" onClick={() => remove(c.id)}>{t.common.delete}</button>
            </div>
          ))}
        </div>
        <div className="stack">
        {tgBot && <TelegramConnect channels={channels} onConnected={load} />}
        <form className="card stack" onSubmit={add}>
          <h3>{tgBot ? t.telegram.manualTitle : t.channels.connect}</h3>
          <label>
            {t.channels.platform}
            <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              {platforms.map((p) => (
                <option key={p.platform} value={p.platform}>{p.label}</option>
              ))}
            </select>
          </label>
          <p className="muted small">{t.channels.help[form.platform]}</p>
          <label>
            {t.channels.name}
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            {t.channels.externalId}
            <input required value={form.externalId} onChange={(e) => setForm({ ...form, externalId: e.target.value })} />
          </label>
          {form.platform !== "mock" && (
            <label>
              {t.channels.token}
              <input required type="password" autoComplete="off" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} />
            </label>
          )}
          <div className="colors">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={form.color === c ? "on" : ""}
                style={{ background: c }}
                onClick={() => setForm({ ...form, color: c })}
                aria-label={c}
              />
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn primary" disabled={busy}>{t.channels.connect}</button>
        </form>
        </div>
      </div>
    </div>
  );
}
