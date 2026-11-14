"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Post } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { useApp } from "@/components/AppContext";
import { dayKey, formatInTz, partsInTz, zonedToUtc } from "@/lib/tz";

type View = "month" | "week" | "day";
/** A calendar (wall-clock) date, independent of time zone. */
type Day = { y: number; m: number; d: number; key: string; inMonth: boolean };

const pad = (n: number) => String(n).padStart(2, "0");
const LOCKED = ["published", "publishing"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** Date arithmetic on wall dates using UTC as a neutral carrier. */
function mkDay(y: number, m: number, d: number, refMonth?: number): Day {
  const dt = new Date(Date.UTC(y, m - 1, d));
  const Y = dt.getUTCFullYear(), M = dt.getUTCMonth() + 1, D = dt.getUTCDate();
  return { y: Y, m: M, d: D, key: `${Y}-${pad(M)}-${pad(D)}`, inMonth: refMonth === undefined || M === refMonth };
}
const weekdayOf = (day: Day) => (new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay() + 6) % 7; // 0=Mon

function readView(): View {
  try {
    const v = localStorage.getItem("pf_cal_view");
    return v === "week" || v === "day" ? v : "month";
  } catch {
    return "month";
  }
}

export default function CalendarPage() {
  const { t, locale } = useI18n();
  const { timezone: tz } = useApp();
  const router = useRouter();
  const nowP = partsInTz(new Date(), tz);
  const todayDay = mkDay(nowP.year, nowP.month, nowP.day);

  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<Day>(todayDay);
  const [posts, setPosts] = useState<Post[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ post: Post; x: number; y: number } | null>(null);
  const [hidden, setHidden] = useState<string[]>([]); // channel ids filtered out
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => setView(readView()), []);
  function changeView(v: View) {
    setView(v);
    try {
      localStorage.setItem("pf_cal_view", v);
    } catch {}
  }

  const days = useMemo<Day[]>(() => {
    if (view === "day") return [anchor];
    if (view === "week") {
      const start = mkDay(anchor.y, anchor.m, anchor.d - weekdayOf(anchor));
      return Array.from({ length: 7 }, (_, i) => mkDay(start.y, start.m, start.d + i));
    }
    const first = mkDay(anchor.y, anchor.m, 1);
    const out = Array.from({ length: 42 }, (_, i) => mkDay(anchor.y, anchor.m, 1 - weekdayOf(first) + i, anchor.m));
    return out.slice(35).every((x) => !x.inMonth) ? out.slice(0, 35) : out;
  }, [view, anchor]);

  const load = useCallback(async () => {
    const a = days[0], b = days[days.length - 1];
    const from = zonedToUtc(a.y, a.m, a.d, 0, 0, tz).toISOString();
    const to = zonedToUtc(b.y, b.m, b.d + 1, 0, 0, tz).toISOString();
    setPosts(await api<Post[]>(`/api/posts?from=${from}&to=${to}`));
  }, [days, tz]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  // In week/day view start scrolled to 7:00
  useEffect(() => {
    if (view !== "month" && gridRef.current) gridRef.current.scrollTop = 7 * 56;
  }, [view]);

  /** posts grouped by "YYYY-MM-DD" and by "YYYY-MM-DD|H" */
  const { byDay, bySlot } = useMemo(() => {
    const byDay: Record<string, Post[]> = {}, bySlot: Record<string, Post[]> = {};
    const visible = posts.filter((p) => !p.targets.length || p.targets.some((x) => !hidden.includes(x.channelId)));
    const sorted = visible.filter((p) => p.scheduledAt).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!));
    for (const p of sorted) {
      const at = new Date(p.scheduledAt!);
      const k = dayKey(at, tz);
      (byDay[k] ??= []).push(p);
      (bySlot[`${k}|${partsInTz(at, tz).hour}`] ??= []).push(p);
    }
    return { byDay, bySlot };
  }, [posts, tz, hidden]);

  const channels = useMemo(() => {
    const m = new Map<string, Post["targets"][number]["channel"]>();
    for (const p of posts) for (const x of p.targets) m.set(x.channel.id, x.channel);
    return [...m.values()];
  }, [posts]);

  const stats = useMemo(() => {
    const s = { total: 0, scheduled: 0, published: 0, failed: 0, draft: 0 };
    for (const p of posts) {
      s.total++;
      if (p.status in s) s[p.status as keyof typeof s]++;
    }
    return s;
  }, [posts]);

  // keyboard shortcuts: ← → navigate, T today, M/W/D views
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "arrowleft") shift(-1);
      else if (k === "arrowright") shift(1);
      else if (k === "t") setAnchor(todayDay);
      else if (k === "m") changeView("month");
      else if (k === "w") changeView("week");
      else if (k === "d") changeView("day");
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  /** Move a post to `day`; keep its time, or set hour (keeping minutes) when dropped on an hour slot. */
  async function moveTo(postId: string, day: Day, hour?: number) {
    const post = posts.find((p) => p.id === postId);
    if (!post?.scheduledAt) return;
    const old = partsInTz(new Date(post.scheduledAt), tz);
    const h = hour ?? old.hour;
    if (dayKey(new Date(post.scheduledAt), tz) === day.key && h === old.hour) return;
    const next = zonedToUtc(day.y, day.m, day.d, h, old.minute, tz);
    const prev = posts;
    setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, scheduledAt: next.toISOString() } : p)));
    try {
      await api(`/api/posts/${postId}/reschedule`, { method: "POST", json: { scheduledAt: next.toISOString() } });
      flash(`${t.calendar.moved}: ${formatInTz(next, tz, locale, { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`);
    } catch (e) {
      setPosts(prev);
      flash(e instanceof Error ? e.message : String(e));
    }
  }

  /** Props that turn any element into a drop target. */
  function dropProps(key: string, day: Day, hour?: number) {
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!dragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (overKey !== key) setOverKey(key);
      },
      onDragLeave: () => setOverKey((k) => (k === key ? null : k)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain") || dragId;
        setOverKey(null);
        setDragId(null);
        if (id) moveTo(id, day, hour);
      },
    };
  }

  // NB: a render function, not a component — defining a component inside render would remount
  // every chip on each state change and cancel the native drag in progress.
  function chip(p: Post) {
    const locked = LOCKED.includes(p.status);
    const color = p.targets[0]?.channel.color ?? "#94a3b8";
    return (
      <Link
        key={p.id}
        href={`/app/posts/${p.id}`}
        draggable={!locked}
        onMouseEnter={(e) => setHover({ post: p, x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHover(null)}
        onDragStart={(e) => {
          setHover(null);
          e.dataTransfer.setData("text/plain", p.id);
          e.dataTransfer.effectAllowed = "move";
          setDragId(p.id);
        }}
        onDragEnd={() => {
          setDragId(null);
          setOverKey(null);
        }}
        onClick={(e) => e.stopPropagation()}
        className={`chip status-${p.status} ${dragId === p.id ? "dragging" : ""} ${locked ? "locked" : ""}`}
        style={{ "--c": color } as React.CSSProperties}
      >
        <span className="chip-time">{formatInTz(p.scheduledAt!, tz, locale, { hour: "2-digit", minute: "2-digit" })}</span>
        <span className="chip-text">{p.title || p.content}</span>
        {view !== "month" && p.targets.length > 0 && (
          <span className="chip-channels">
            {p.targets.map((x) => (
              <span key={x.id} className="dot" style={{ "--c": x.channel.color } as React.CSSProperties} title={x.channel.name} />
            ))}
          </span>
        )}
      </Link>
    );
  }

  function shift(dir: -1 | 1) {
    setAnchor((a) =>
      view === "month" ? mkDay(a.y, a.m + dir, 1) : view === "week" ? mkDay(a.y, a.m, a.d + 7 * dir) : mkDay(a.y, a.m, a.d + dir),
    );
  }

  const noon = (d: Day) => zonedToUtc(d.y, d.m, d.d, 12, 0, tz);
  const title =
    view === "month"
      ? formatInTz(noon(anchor), tz, locale, { month: "long", year: "numeric" })
      : view === "day"
        ? formatInTz(noon(anchor), tz, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : `${formatInTz(noon(days[0]), tz, locale, { day: "numeric", month: "short" })} – ${formatInTz(noon(days[6]), tz, locale, { day: "numeric", month: "short", year: "numeric" })}`;

  const newAt = (d: Day, h?: number) =>
    `/app/posts/new?date=${d.key}${h !== undefined ? `&hour=${h}` : ""}`;

  return (
    <div>
      <div className="page-head">
        <h1 className="cap">{title}</h1>
        <div className="row wrap">
          <div className="seg">
            {(["month", "week", "day"] as const).map((v) => (
              <button key={v} className={view === v ? "active" : ""} onClick={() => changeView(v)}>
                {t.calendar.views[v]}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => shift(-1)} aria-label={t.calendar.prev}>←</button>
          <button className="btn" onClick={() => setAnchor(todayDay)}>{t.common.today}</button>
          <button className="btn" onClick={() => shift(1)} aria-label={t.calendar.next}>→</button>
        </div>
      </div>
      <div className="cal-toolbar">
        <div className="stats">
          <div className="stat"><span>{t.calendar.stats.total}</span><b>{stats.total}</b></div>
          <div className="stat s-scheduled"><span>{t.status.scheduled}</span><b>{stats.scheduled}</b></div>
          <div className="stat s-published"><span>{t.status.published}</span><b>{stats.published}</b></div>
          <div className="stat s-failed"><span>{t.status.failed}</span><b>{stats.failed}</b></div>
          <div className="stat s-draft"><span>{t.status.draft}</span><b>{stats.draft}</b></div>
        </div>
        <div className="filters">
          {channels.map((c) => {
            const off = hidden.includes(c.id);
            return (
              <button
                key={c.id}
                className={`filter ${off ? "off" : ""}`}
                style={{ "--c": c.color } as React.CSSProperties}
                onClick={() => setHidden((h) => (off ? h.filter((x) => x !== c.id) : [...h, c.id]))}
              >
                <span className="dot" />{c.name}
              </button>
            );
          })}
        </div>
      </div>
      <p className="muted small kbd-hint">
        {t.calendar.dragHint} · <kbd>←</kbd><kbd>→</kbd> <kbd>T</kbd> <kbd>M</kbd><kbd>W</kbd><kbd>D</kbd> · <span className="mono">{tz}</span>
      </p>

      {view === "month" ? (
        <div className="calendar">
          {t.calendar.weekdays.map((w) => (
            <div key={w} className="cal-weekday">{w}</div>
          ))}
          {days.map((day) => (
            <div
              key={day.key}
              className={`cal-day ${day.inMonth ? "" : "out"} ${day.key === todayDay.key ? "today" : ""} ${overKey === day.key ? "over" : ""}`}
              {...dropProps(day.key, day)}
              onDoubleClick={() => router.push(newAt(day))}
            >
              <div className="cal-day-head">
                <button
                  className="cal-num"
                  onClick={() => {
                    setAnchor(day);
                    changeView("day");
                  }}
                >
                  {day.d}
                </button>
                <Link className="cal-add" href={newAt(day)} title={t.calendar.addHere}>+</Link>
              </div>
              <div className="cal-posts">
                {(byDay[day.key] ?? []).map(chip)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`timegrid ${view}`} style={{ "--cols": days.length } as React.CSSProperties}>
          <div className="tg-head">
            <div className="tg-corner" />
            {days.map((day) => (
              <button
                key={day.key}
                className={`tg-dayhead ${day.key === todayDay.key ? "today" : ""}`}
                onClick={() => {
                  setAnchor(day);
                  changeView("day");
                }}
              >
                <span>{t.calendar.weekdays[weekdayOf(day)]}</span>
                <b>{day.d}</b>
              </button>
            ))}
          </div>
          <div className="tg-body" ref={gridRef}>
            {HOURS.map((h) => (
              <div key={h} className="tg-row">
                <div className="tg-hour">{pad(h)}:00</div>
                {days.map((day) => {
                  const key = `${day.key}|${h}`;
                  const isNow = day.key === todayDay.key && h === nowP.hour;
                  return (
                    <div
                      key={key}
                      className={`tg-cell ${overKey === key ? "over" : ""} ${isNow ? "now" : ""}`}
                      {...dropProps(key, day, h)}
                      onDoubleClick={() => router.push(newAt(day, h))}
                      title={t.calendar.addHere}
                    >
                      {isNow && (
                        <div className="now-line" style={{ top: `${(partsInTz(new Date(nowTs), tz).minute / 60) * 100}%` }} />
                      )}
                      {(bySlot[key] ?? []).map(chip)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      {hover && !dragId && (
        <div
          className="preview"
          style={{ left: Math.min(hover.x + 14, (typeof window !== "undefined" ? innerWidth : 1200) - 340), top: hover.y + 14 }}
        >
          <div className="preview-head">
            <span className={`badge status-${hover.post.status}`}>{t.status[hover.post.status as keyof typeof t.status]}</span>
            <span className="mono small">
              {formatInTz(hover.post.scheduledAt!, tz, locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          {hover.post.title && <b>{hover.post.title}</b>}
          <p>{hover.post.content.slice(0, 220)}{hover.post.content.length > 220 ? "…" : ""}</p>
          <div className="row wrap">
            {hover.post.targets.map((x) => (
              <span key={x.id} className="tag" style={{ "--c": x.channel.color } as React.CSSProperties}>
                <span className="dot" />{x.channel.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
