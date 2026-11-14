"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Post } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { useApp } from "@/components/AppContext";
import { formatInTz } from "@/lib/tz";

const FILTERS = ["", "draft", "scheduled", "published", "failed"] as const;

export default function PostsPage() {
  const { t, locale } = useI18n();
  const { timezone: tz } = useApp();
  const [status, setStatus] = useState<string>("");
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    setPosts(null);
    api<Post[]>(`/api/posts${status ? `?status=${status}` : ""}`).then(setPosts);
  }, [status]);

  return (
    <div>
      <div className="page-head">
        <h1>{t.posts.title}</h1>
        <div className="seg">
          {FILTERS.map((f) => (
            <button key={f} className={status === f ? "active" : ""} onClick={() => setStatus(f)}>
              {f ? t.status[f] : t.posts.filterAll}
            </button>
          ))}
        </div>
      </div>
      {!posts ? (
        <p className="muted">{t.common.loading}</p>
      ) : posts.length === 0 ? (
        <div className="card empty">{t.posts.noPosts}</div>
      ) : (
        <div className="list">
          {posts.map((p) => (
            <Link key={p.id} href={`/app/posts/${p.id}`} className="card list-item">
              <div className="list-when">
                {p.scheduledAt
                  ? formatInTz(p.scheduledAt, tz, locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                  : t.posts.noDate}
              </div>
              <div className="list-body">
                <b>{p.title || p.content.slice(0, 80)}</b>
                <span className="muted small clamp">{p.content}</span>
              </div>
              <div className="list-channels">
                {p.targets.map((x) => (
                  <span key={x.id} className="tag" style={{ "--c": x.channel.color } as React.CSSProperties}>
                    <span className="dot" />{x.channel.name}
                  </span>
                ))}
              </div>
              <span className={`badge status-${p.status}`}>{t.status[p.status as keyof typeof t.status]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
