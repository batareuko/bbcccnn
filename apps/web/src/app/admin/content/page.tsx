"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { dt } from "../fmt";

type AdminPost = {
  id: string; title: string; content: string; status: string; scheduledAt: string | null; updatedAt: string;
  flagged: boolean; flagReason: string | null; moderatedAt: string | null; mediaUrls: string; link: string | null;
  workspace: { id: string; name: string; suspendedAt: string | null };
  targets: { status: string; error: string | null; contentOverride: string | null; channel: { name: string; platform: string; color: string } }[];
};

const FILTERS = [
  ["review", "На перевірці"],
  ["flagged", "З позначкою"],
  ["failed", "З помилками"],
  ["blocked", "Заблоковані"],
  ["all", "Усі"],
] as const;

export default function AdminContent() {
  const sp = useSearchParams();
  const [filter, setFilter] = useState(sp.get("filter") ?? (sp.get("q") ? "all" : "review"));
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setPosts(null);
    setPosts(await api(`/api/admin/posts?filter=${filter}&q=${encodeURIComponent(q)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, body: Record<string, unknown>, label: string) {
    setMsg("");
    try {
      await api(`/api/admin/posts/${id}`, { method: "POST", json: body });
      setMsg(`✓ ${label}`);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }
  const ask = (t: string) => {
    const r = prompt(t);
    return r && r.trim().length >= 3 ? r.trim() : null;
  };

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Модерація контенту</h1>
        <form className="row" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <input placeholder="текст, id поста або простору" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 300 }} />
          <button className="btn">Шукати</button>
        </form>
      </div>
      <div className="seg">
        {FILTERS.map(([f, label]) => (
          <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{label}</button>
        ))}
      </div>
      {msg && <p className="notice">{msg}</p>}
      {!posts ? <p className="muted">Завантаження…</p> : posts.length === 0 ? <div className="card empty">Порожньо — все чисто ✨</div> : null}
      {posts?.map((p) => {
        const media = JSON.parse(p.mediaUrls || "[]") as string[];
        return (
          <div key={p.id} className={`card stack mod-post ${p.flagged ? "flagged" : ""}`}>
            <div className="row wrap">
              <span className={`badge status-${p.status}`}>{p.status}</span>
              {p.flagged && <span className="badge status-review">⚑ {p.flagReason ?? "позначено"}</span>}
              <b>{p.title || "Без назви"}</b>
              <span className="muted small">
                <Link href={`/admin/users?q=${p.workspace.id}`}>{p.workspace.name}</Link>
                {p.workspace.suspendedAt && " (призупинено)"} · заплановано {dt(p.scheduledAt)} · змінено {dt(p.updatedAt)}
              </span>
            </div>
            <p className="mod-text">{p.content}</p>
            {media.length > 0 && (
              <div className="thumbs">
                {media.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" referrerPolicy="no-referrer" />
                ))}
              </div>
            )}
            {p.link && <a className="small mono" href={p.link} target="_blank" rel="noreferrer nofollow">{p.link}</a>}
            <div className="row wrap">
              {p.targets.map((t, i) => (
                <span key={i} className="tag" style={{ "--c": t.channel.color } as React.CSSProperties} title={t.error ?? t.contentOverride ?? ""}>
                  <span className="dot" />{t.channel.platform}: {t.channel.name} · {t.status}
                </span>
              ))}
            </div>
            {p.targets.filter((t) => t.error).map((t, i) => <span key={i} className="small error">{t.channel.platform}: {t.error}</span>)}
            <div className="row wrap">
              {(p.status === "review" || p.status === "blocked" || p.flagged) && (
                <button className="btn small-btn primary" onClick={() => act(p.id, { action: "approve" }, "Схвалено")}>✓ Схвалити</button>
              )}
              {!["blocked", "published", "publishing"].includes(p.status) && (
                <button className="btn small-btn danger" onClick={() => { const reason = ask("Причина блокування поста:"); if (reason) act(p.id, { action: "block", reason }, "Заблоковано"); }}>⛔ Заблокувати</button>
              )}
              {!p.flagged && (
                <button className="btn small-btn ghost" onClick={() => { const reason = ask("Чому позначаєте?"); if (reason) act(p.id, { action: "flag", reason }, "Позначено"); }}>⚑ Позначити</button>
              )}
              <span className="muted small mono">{p.id}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
