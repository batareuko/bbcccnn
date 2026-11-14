"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ago, dt, money } from "./fmt";

type Overview = {
  generatedAt: string;
  health: { scheduler: { lastTickAgeSec: number | null; via: string | null; ok: boolean }; overdue: number; stuckPublishing: number; published24: number; failed24: number };
  users: { total: number; new7: number; blocked: number };
  workspaces: { total: number; suspended: number; plans: Record<string, number> };
  subscriptions: Record<string, number>;
  mrr: Record<string, number>;
  payments30: { paid: Record<string, number>; paidCount: number; failedCount: number };
  posts: Record<string, number>;
  delivery7: Record<string, { published: number; failed: number }>;
  errorGroups: [string, number][];
  recentFailures: { platform: string; channel: string; error: string | null; postId: string; workspaceId: string; at: string }[];
  ai: { spent: number; topups: number; byKind: Record<string, number>; byProvider: Record<string, number> };
  moderation: { review: number; flagged: number; keywords: number; hold: boolean };
  integrations: Record<string, string | boolean | null | { provider: string; configured: boolean }>;
  telegramWebhook: { url?: string; pending_update_count?: number; last_error_message?: string; last_error_date?: number; error?: string } | null;
};

const Ok = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <span className={`health ${ok ? "ok" : "bad"}`}>{ok ? "●" : "●"} {children}</span>
);

export default function AdminOverview() {
  const [d, setD] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const load = () => api<Overview>("/api/admin/overview").then(setD).catch((e) => setErr(String(e.message ?? e)));
  useEffect(() => {
    load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, []);
  if (err) return <p className="error">{err}</p>;
  if (!d) return <p className="muted">Завантаження…</p>;

  const h = d.health;
  const integ = d.integrations;
  const ai = integ.ai as { provider: string; configured: boolean };

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Огляд</h1>
        <span className="muted small mono">оновлено {dt(d.generatedAt)} · автооновлення 30 с</span>
      </div>

      <section className="admin-grid">
        <div className="card stack">
          <h3>Стан системи</h3>
          <Ok ok={h.scheduler.ok}>Планувальник: {ago(h.scheduler.lastTickAgeSec)}{h.scheduler.via ? ` (${h.scheduler.via})` : ""}</Ok>
          <Ok ok={h.overdue === 0}>Прострочені пости в черзі: <b>{h.overdue}</b></Ok>
          <Ok ok={h.stuckPublishing === 0}>Завислі «публікується» &gt;15 хв: <b>{h.stuckPublishing}</b></Ok>
          <span className="small">За 24 год: <b>{h.published24}</b> опубліковано · <b className={h.failed24 ? "error" : ""}>{h.failed24}</b> з помилками</span>
          {!h.scheduler.ok && <p className="muted small">Запустіть <code>npm run worker</code> або налаштуйте виклик <code>/api/cron</code> щохвилини.</p>}
        </div>

        <div className="card stack">
          <h3>Користувачі та простори</h3>
          <div className="kpis">
            <div><b>{d.users.total}</b><span>користувачів</span></div>
            <div><b>+{d.users.new7}</b><span>за 7 днів</span></div>
            <div><b>{d.users.blocked}</b><span>заблоковано</span></div>
            <div><b>{d.workspaces.suspended}</b><span>призупинено</span></div>
          </div>
          <div className="row wrap">
            {Object.entries(d.workspaces.plans).map(([p, n]) => <span key={p} className="tag">{p}: {n}</span>)}
          </div>
        </div>

        <div className="card stack">
          <h3>Гроші</h3>
          <div className="kpis">
            <div><b>{money(d.mrr.UAH, "UAH")}</b><span>MRR WayForPay</span></div>
            <div><b>{money(d.mrr.USD, "USD")}</b><span>MRR Paddle</span></div>
          </div>
          <span className="small">За 30 днів: {Object.entries(d.payments30.paid).map(([c, v]) => money(v, c)).join(" + ") || "0"} · {d.payments30.paidCount} оплат · <span className={d.payments30.failedCount ? "error" : ""}>{d.payments30.failedCount} невдалих</span></span>
          <div className="row wrap">
            {Object.entries(d.subscriptions).map(([k, n]) => <span key={k} className="tag mono">{k}: {n}</span>)}
          </div>
        </div>

        <div className="card stack">
          <h3>AI за 7 днів</h3>
          <div className="kpis">
            <div><b>{d.ai.spent}</b><span>кредитів витрачено</span></div>
            <div><b>{d.ai.topups}</b><span>куплено</span></div>
          </div>
          <div className="row wrap">
            {Object.entries(d.ai.byKind).map(([k, n]) => <span key={k} className="tag">{k}: {n}</span>)}
            {Object.entries(d.ai.byProvider).map(([k, n]) => <span key={k} className="tag mono">{k}: {n}</span>)}
          </div>
        </div>

        <div className="card stack">
          <h3>Модерація</h3>
          <div className="kpis">
            <div><b className={d.moderation.review ? "error" : ""}>{d.moderation.review}</b><span>чекають перевірки</span></div>
            <div><b>{d.moderation.flagged}</b><span>з позначкою</span></div>
          </div>
          <span className="muted small">Стоп-слів: {d.moderation.keywords} · утримання: {d.moderation.hold ? "увімкнено" : "вимкнено"}</span>
          <Link href="/admin/content?filter=review" className="btn">Відкрити чергу →</Link>
        </div>

        <div className="card stack">
          <h3>Інтеграції</h3>
          <Ok ok={ai.configured}>AI: {ai.provider}</Ok>
          <Ok ok={!!integ.wayforpay}>WayForPay{integ.wayforpay && !integ.wayforpayRegularApi ? " (без merchantPassword — немає звірки й скасування)" : ""}</Ok>
          <Ok ok={!!integ.paddle}>Paddle ({String(integ.paddleEnv)})</Ok>
          <Ok ok={!!integ.telegramBot}>Telegram-бот</Ok>
          <Ok ok={!!integ.cronSecret}>CRON_SECRET</Ok>
          <Ok ok={!!integ.legalDetails}>Реквізити ФОП (LEGAL_*)</Ok>
          <span className="muted small mono">{String(integ.siteUrl ?? "NEXT_PUBLIC_SITE_URL не задано")}</span>
          {d.telegramWebhook && (
            <span className="small">
              Вебхук Telegram:{" "}
              {d.telegramWebhook.error ? <span className="error">{d.telegramWebhook.error}</span> : (
                <>
                  <span className="mono">{d.telegramWebhook.url || "не встановлено"}</span> · у черзі {d.telegramWebhook.pending_update_count ?? 0}
                  {d.telegramWebhook.last_error_message && <span className="error"> · {d.telegramWebhook.last_error_message}</span>}
                </>
              )}
            </span>
          )}
        </div>
      </section>

      <section className="admin-grid two">
        <div className="card stack">
          <h3>Доставка за 7 днів</h3>
          <table className="table">
            <tbody>
              {Object.entries(d.delivery7).map(([p, v]) => {
                const total = v.published + v.failed;
                const rate = total ? Math.round((v.failed / total) * 100) : 0;
                return (
                  <tr key={p}>
                    <td><b>{p}</b></td>
                    <td className="mono">{v.published} ✓</td>
                    <td className="mono">{v.failed} ✗</td>
                    <td><span className={`badge ${rate > 10 ? "status-failed" : "status-published"}`}>{rate}% помилок</span></td>
                  </tr>
                );
              })}
              {!Object.keys(d.delivery7).length && <tr><td className="muted">Ще немає публікацій</td></tr>}
            </tbody>
          </table>
          <h3>Пости за статусами</h3>
          <div className="row wrap">{Object.entries(d.posts).map(([s, n]) => <span key={s} className={`badge status-${s}`}>{s}: {n}</span>)}</div>
        </div>

        <div className="card stack">
          <h3>Найчастіші помилки</h3>
          {d.errorGroups.length === 0 && <span className="muted">Помилок немає 🎉</span>}
          {d.errorGroups.map(([e, n]) => (
            <div key={e} className="err-row"><span className="mono small">{e}</span><b>×{n}</b></div>
          ))}
          <h3>Останні збої</h3>
          {d.recentFailures.map((f, i) => (
            <div key={i} className="err-row">
              <span className="small"><b>{f.platform}</b> · {f.channel} · <span className="muted">{dt(f.at)}</span><br /><span className="error">{f.error}</span></span>
              <Link className="btn small-btn" href={`/admin/content?q=${f.postId}`}>пост</Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
