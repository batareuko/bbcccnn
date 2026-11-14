"use client";
import { useEffect, useState } from "react";
import { api, type Channel } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { useApp } from "@/components/AppContext";
import { formatInTz } from "@/lib/tz";

type Source = {
  id: string; type: string; name: string; url: string; template: string; channelIds: string;
  delayMinutes: number; aiRewrite: boolean; enabled: boolean; lastCheckedAt: string | null;
};

const EMPTY = {
  type: "wordpress" as "wordpress" | "rss",
  name: "",
  url: "",
  template: "{title}\n\n{excerpt}\n\n{link}",
  channelIds: [] as string[],
  delayMinutes: 0,
  aiRewrite: false,
};

export default function SourcesPage() {
  const { t, locale } = useI18n();
  const { timezone: tz, aiAllowed } = useApp();
  const [sources, setSources] = useState<Source[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const load = () => api<Source[]>("/api/sources").then(setSources);
  useEffect(() => {
    load();
    api<Channel[]>("/api/channels").then(setChannels);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/sources", { method: "POST", json: form });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function sync(id: string) {
    setInfo("…");
    try {
      const r = await api<{ created: number }>(`/api/sources/${id}/sync`, { method: "POST" });
      setInfo(`${t.sources.imported}: ${r.created}`);
      load();
    } catch (err) {
      setInfo(err instanceof Error ? err.message : String(err));
    }
  }

  async function remove(id: string) {
    if (!confirm(t.common.confirmDelete)) return;
    await api(`/api/sources/${id}`, { method: "DELETE" });
    load();
  }

  const chName = (id: string) => channels.find((c) => c.id === id)?.name ?? "?";

  return (
    <div>
      <div className="page-head"><h1>{t.sources.title}</h1></div>
      <p className="muted">{t.sources.subtitle}</p>
      {info && <p className="notice">{info}</p>}
      <div className="two-col">
        <div className="list">
          {sources.length === 0 && <div className="card empty">{t.sources.none}</div>}
          {sources.map((s) => (
            <div key={s.id} className="card stack">
              <div className="row">
                <span className="tag">{s.type === "rss" ? "RSS" : "WordPress"}</span>
                <b>{s.name}</b>
                <div className="spacer" />
                <button className="btn" onClick={() => sync(s.id)}>{t.sources.sync}</button>
                <button className="btn ghost danger" onClick={() => remove(s.id)}>{t.common.delete}</button>
              </div>
              <span className="muted small">{s.url}</span>
              <span className="small">→ {(JSON.parse(s.channelIds) as string[]).map(chName).join(", ") || "—"}</span>
              <span className="muted small">
                {t.sources.lastChecked}:{" "}
                {s.lastCheckedAt ? formatInTz(s.lastCheckedAt, tz, locale, { dateStyle: "medium", timeStyle: "short" }) : t.sources.never}
                {s.aiRewrite && " · ✨ AI"}
                {s.delayMinutes > 0 && ` · +${s.delayMinutes} min`}
              </span>
            </div>
          ))}
        </div>
        <form className="card stack" onSubmit={add}>
          <label>
            {t.sources.type}
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "wordpress" | "rss" })}>
              <option value="wordpress">WordPress</option>
              <option value="rss">RSS / Atom</option>
            </select>
          </label>
          <label>
            {t.channels.name}
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            {t.sources.url}
            <input required type="url" value={form.url} placeholder={form.type === "rss" ? "https://example.com/feed" : "https://example.com"} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </label>
          <label>
            {t.sources.template}
            <textarea rows={4} value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} />
            <span className="muted small">{t.sources.templateHint}</span>
          </label>
          <div className="channel-picks">
            {channels.map((c) => (
              <label key={c.id} className={`pick ${form.channelIds.includes(c.id) ? "on" : ""}`} style={{ "--c": c.color } as React.CSSProperties}>
                <input
                  type="checkbox"
                  checked={form.channelIds.includes(c.id)}
                  onChange={(e) =>
                    setForm({ ...form, channelIds: e.target.checked ? [...form.channelIds, c.id] : form.channelIds.filter((x) => x !== c.id) })
                  }
                />
                <span className="dot" />{c.name}
              </label>
            ))}
          </div>
          <label>
            {t.sources.delay}
            <input type="number" min={0} value={form.delayMinutes} onChange={(e) => setForm({ ...form, delayMinutes: +e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" disabled={!aiAllowed} checked={form.aiRewrite} onChange={(e) => setForm({ ...form, aiRewrite: e.target.checked })} />
            ✨ {t.sources.aiRewrite} {!aiAllowed && <span className="muted small">(Pro)</span>}
          </label>
          <p className="muted small">{t.sources.onlyNew}</p>
          {error && <p className="error">{error}</p>}
          <button className="btn primary">{t.common.add}</button>
        </form>
      </div>
    </div>
  );
}
