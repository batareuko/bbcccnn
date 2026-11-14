"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Channel, type Platform, type Post } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { useApp } from "./AppContext";
import { fromTzInput, toTzInput } from "@/lib/tz";

type Props = { post?: Post; initialDate?: string };

export function PostEditor({ post, initialDate }: Props) {
  const { t } = useI18n();
  const { timezone: tz, aiAllowed, aiConfigured } = useApp();
  const router = useRouter();
  const readonly = !!post && ["published", "publishing"].includes(post.status);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [platforms, setPlatforms] = useState<Record<string, Platform>>({});
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [media, setMedia] = useState((JSON.parse(post?.mediaUrls ?? "[]") as string[]).join("\n"));
  const [link, setLink] = useState(post?.link ?? "");
  const [when, setWhen] = useState(() => {
    if (post?.scheduledAt) return toTzInput(new Date(post.scheduledAt), tz);
    if (initialDate) return initialDate;
    return toTzInput(new Date(Date.now() + 3600e3), tz);
  });
  const [selected, setSelected] = useState<string[]>(post?.targets.map((x) => x.channelId) ?? []);
  const [overrides, setOverrides] = useState<Record<string, string>>(
    Object.fromEntries(post?.targets.filter((x) => x.contentOverride).map((x) => [x.channelId, x.contentOverride!]) ?? []),
  );
  const [tone, setTone] = useState("");
  const [language, setLanguage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Channel[]>("/api/channels").then(setChannels);
    api<Platform[]>("/api/platforms").then((ps) => setPlatforms(Object.fromEntries(ps.map((p) => [p.platform, p]))));
  }, []);

  const mediaUrls = useMemo(() => media.split("\n").map((s) => s.trim()).filter(Boolean), [media]);
  const selectedChannels = channels.filter((c) => selected.includes(c.id));

  function payload(status: "draft" | "scheduled") {
    const at = fromTzInput(when, tz);
    return {
      title,
      content,
      mediaUrls,
      link: link || null,
      status,
      scheduledAt: at ? at.toISOString() : null,
      targets: selected.map((channelId) => ({ channelId, contentOverride: overrides[channelId] || null })),
    };
  }

  async function save(status: "draft" | "scheduled", thenPublish = false) {
    setBusy(status);
    setError("");
    try {
      const saved = post
        ? await api<Post>(`/api/posts/${post.id}`, { method: "PATCH", json: payload(status) })
        : await api<Post>("/api/posts", { method: "POST", json: payload(status) });
      if (thenPublish) await api(`/api/posts/${saved.id}/publish`, { method: "POST" });
      router.push(thenPublish ? `/app/posts/${saved.id}` : "/app");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function runAi() {
    setBusy("ai");
    setError("");
    try {
      const plats = [...new Set(selectedChannels.map((c) => c.platform))];
      const r = await api<{ variants: { platform: string; text: string }[] }>("/api/ai/rewrite", {
        method: "POST",
        json: { text: content, platforms: plats, tone: tone || undefined, language: language || undefined, instructions: instructions || undefined },
      });
      const byPlatform = Object.fromEntries(r.variants.map((v) => [v.platform, v.text]));
      router.refresh(); // update credit balance in the header
      setOverrides((o) => {
        const next = { ...o };
        for (const c of selectedChannels) if (byPlatform[c.platform]) next[c.id] = byPlatform[c.platform];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!post || !confirm(t.common.confirmDelete)) return;
    await api(`/api/posts/${post.id}`, { method: "DELETE" });
    router.push("/app");
    router.refresh();
  }

  async function retry() {
    if (!post) return;
    setBusy("retry");
    try {
      await api(`/api/posts/${post.id}/publish`, { method: "POST" });
      router.refresh();
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="editor">
      <div className="page-head">
        <h1>{post ? t.editor.editTitle : t.editor.newTitle}</h1>
        {post && <span className={`badge status-${post.status}`}>{t.status[post.status as keyof typeof t.status]}</span>}
      </div>
      {readonly && <p className="notice">{t.editor.readonly}</p>}

      <div className="editor-grid">
        <section className="card stack">
          <label>
            {t.editor.internalTitle}
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={readonly} />
          </label>
          <label>
            {t.editor.text}
            <textarea rows={9} value={content} onChange={(e) => setContent(e.target.value)} disabled={readonly} />
            <span className="muted small">{content.length} {t.editor.chars}</span>
          </label>
          <label>
            {t.editor.media}
            <textarea rows={2} value={media} onChange={(e) => setMedia(e.target.value)} disabled={readonly} placeholder="https://…/image.jpg" />
          </label>
          {mediaUrls.length > 0 && (
            <div className="thumbs">
              {mediaUrls.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" />
              ))}
            </div>
          )}
          <label>
            {t.editor.link}
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} disabled={readonly} placeholder="https://" />
          </label>
        </section>

        <aside className="stack">
          <section className="card stack">
            <h3>{t.editor.channels}</h3>
            {channels.length === 0 && <p className="muted">{t.editor.noChannels} → <a href="/app/channels">{t.nav.channels}</a></p>}
            <div className="channel-picks">
              {channels.map((c) => (
                <label key={c.id} className={`pick ${selected.includes(c.id) ? "on" : ""}`} style={{ "--c": c.color } as React.CSSProperties}>
                  <input
                    type="checkbox"
                    disabled={readonly}
                    checked={selected.includes(c.id)}
                    onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))}
                  />
                  <span className="dot" />
                  {c.name}
                  <span className="muted small">{platforms[c.platform]?.label ?? c.platform}</span>
                </label>
              ))}
            </div>
            <label>
              {t.editor.when} <span className="muted small">({tz})</span>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} disabled={readonly} />
            </label>
            {!readonly && (
              <div className="row wrap">
                <button className="btn primary" disabled={!!busy || !content} onClick={() => save("scheduled")}>{t.editor.schedule}</button>
                <button className="btn" disabled={!!busy || !content} onClick={() => save("draft")}>{t.editor.saveDraft}</button>
                <button className="btn" disabled={!!busy || !content || !selected.length} onClick={() => save("draft", true)}>{t.editor.publishNow}</button>
              </div>
            )}
            {post && <button className="btn danger ghost" onClick={remove}>{t.common.delete}</button>}
          </section>

          {!readonly && (
            <section className="card stack ai-card">
              <h3>✨ {t.editor.ai}</h3>
              <p className="muted small">{t.editor.aiHint}</p>
              {!aiAllowed || !aiConfigured ? (
                <p className="muted small">{!aiAllowed ? t.planner.needPlan : t.planner.needKey}</p>
              ) : (
                <>
                  <label>
                    {t.editor.tone}
                    <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder={t.editor.tonePh} />
                  </label>
                  <label>
                    {t.editor.language}
                    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                      <option value="">{t.editor.sameLang}</option>
                      <option value="Ukrainian">Українська</option>
                      <option value="English">English</option>
                      <option value="Polish">Polski</option>
                      <option value="German">Deutsch</option>
                    </select>
                  </label>
                  <label>
                    {t.editor.instructions}
                    <input value={instructions} onChange={(e) => setInstructions(e.target.value)} />
                  </label>
                  <button className="btn accent" disabled={!!busy || !content || !selected.length} onClick={runAi}>
                    {busy === "ai" ? t.editor.aiBusy : `${t.editor.aiRun} · ${t.credits.rewriteCost}`}
                  </button>
                  {!selected.length && <span className="muted small">{t.editor.aiChooseChannels}</span>}
                </>
              )}
            </section>
          )}
        </aside>
      </div>

      {selectedChannels.length > 0 && (
        <section className="stack" style={{ marginTop: 20 }}>
          <h3>{t.editor.perChannel}</h3>
          <div className="variants">
            {selectedChannels.map((c) => {
              const max = platforms[c.platform]?.maxLength ?? 0;
              const text = overrides[c.id] ?? "";
              const target = post?.targets.find((x) => x.channelId === c.id);
              return (
                <div key={c.id} className="card variant" style={{ "--c": c.color } as React.CSSProperties}>
                  <div className="variant-head">
                    <span className="dot" /> <b>{c.name}</b>
                    <span className="muted small">{(text || content).length}/{max}</span>
                    {target && target.status !== "pending" && (
                      <span className={`badge status-${target.status}`}>{target.status}</span>
                    )}
                  </div>
                  <textarea
                    rows={6}
                    value={text}
                    placeholder={content}
                    disabled={readonly}
                    onChange={(e) => setOverrides((o) => ({ ...o, [c.id]: e.target.value }))}
                  />
                  {target?.error && <p className="error small">{target.error}</p>}
                </div>
              );
            })}
          </div>
          {post?.status === "failed" && (
            <button className="btn" disabled={!!busy} onClick={retry}>{t.editor.retry}</button>
          )}
        </section>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
