"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { dt } from "../fmt";

type Ws = {
  id: string; name: string; role: string; plan: string; storedPlan: string; trialDaysLeft: number | null;
  billing: { provider: string | null; status: string | null; interval: string | null; periodEnd: string | null };
  aiCredits: number; suspendedAt: string | null; suspendReason: string | null;
  counts: { posts: number; channels: number; members: number };
};
type User = { id: string; email: string; role: string; createdAt: string; lastLogin: string | null; blockedAt: string | null; blockReason: string | null; workspaces: Ws[] };

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ total: number; users: User[] } | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async (query = q) => {
    setData(await api(`/api/admin/users?q=${encodeURIComponent(query)}`));
  }, [q]);
  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(url: string, body: Record<string, unknown>, label: string) {
    setMsg("");
    try {
      await api(url, { method: "POST", json: body });
      setMsg(`✓ ${label}`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }
  const ask = (text: string) => {
    const r = prompt(text);
    return r && r.trim().length >= 3 ? r.trim() : null;
  };

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Користувачі</h1>
        <form className="row" onSubmit={(e) => { e.preventDefault(); load(q); }}>
          <input placeholder="email, назва простору або id" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 320 }} />
          <button className="btn">Шукати</button>
        </form>
      </div>
      {msg && <p className="notice">{msg}</p>}
      {!data ? <p className="muted">Завантаження…</p> : <p className="muted small">Знайдено: {data.total}</p>}
      {data?.users.map((u) => (
        <div key={u.id} className={`card stack admin-user ${u.blockedAt ? "blocked" : ""}`}>
          <div className="row wrap">
            <b>{u.email}</b>
            {u.role === "admin" && <span className="badge status-scheduled">admin</span>}
            {u.blockedAt && <span className="badge status-failed" title={u.blockReason ?? ""}>заблоковано {dt(u.blockedAt)}</span>}
            <span className="muted small">реєстрація {dt(u.createdAt)} · вхід {dt(u.lastLogin)}</span>
            <div className="spacer" />
            {u.blockedAt ? (
              <button className="btn small-btn" onClick={() => act(`/api/admin/users/${u.id}`, { action: "unblock" }, "Розблоковано")}>Розблокувати</button>
            ) : (
              <button className="btn small-btn danger" onClick={() => { const reason = ask("Причина блокування (бачитимуть адміни):"); if (reason) act(`/api/admin/users/${u.id}`, { action: "block", reason }, "Заблоковано"); }}>Заблокувати</button>
            )}
            <button className="btn small-btn ghost" onClick={() => act(`/api/admin/users/${u.id}`, { action: u.role === "admin" ? "remove_admin" : "make_admin" }, "Роль змінено")}>
              {u.role === "admin" ? "Зняти admin" : "Зробити admin"}
            </button>
          </div>
          {u.blockReason && <span className="small error">Причина: {u.blockReason}</span>}

          {u.workspaces.map((w) => (
            <div key={w.id} className={`ws-row ${w.suspendedAt ? "suspended" : ""}`}>
              <div className="stack" style={{ gap: 2 }}>
                <span><b>{w.name}</b> <span className="muted small mono">{w.id}</span></span>
                <span className="small">
                  <span className={`badge ${w.plan === "expired" ? "status-failed" : "status-published"}`}>{w.plan}</span>{" "}
                  {w.trialDaysLeft !== null && `trial: ${w.trialDaysLeft} дн · `}
                  {w.billing.provider && `${w.billing.provider} ${w.billing.status ?? ""} ${w.billing.interval ?? ""} до ${dt(w.billing.periodEnd)} · `}
                  ✨ {w.aiCredits} · постів {w.counts.posts} · каналів {w.counts.channels} · учасників {w.counts.members}
                </span>
                {w.suspendedAt && <span className="small error">Призупинено {dt(w.suspendedAt)}: {w.suspendReason}</span>}
              </div>
              <div className="row wrap">
                <Link className="btn small-btn ghost" href={`/admin/content?q=${w.id}`}>Пости</Link>
                <button className="btn small-btn" onClick={() => { const n = Number(prompt("Скільки AI-кредитів додати? (від'ємне число — списати)", "50")); if (n) act(`/api/admin/workspaces/${w.id}`, { action: "grant_credits", amount: n }, `Кредити: ${n > 0 ? "+" : ""}${n}`); }}>✨ Кредити</button>
                {w.storedPlan === "trial" && (
                  <button className="btn small-btn" onClick={() => { const n = Number(prompt("Подовжити пробний період на скільки днів?", "7")); if (n) act(`/api/admin/workspaces/${w.id}`, { action: "extend_trial", days: n }, `Trial +${n} дн`); }}>Trial +</button>
                )}
                <button className="btn small-btn" onClick={() => {
                  const plan = prompt("Безкоштовний тариф (starter / pro / agency):", "pro");
                  const days = Number(prompt("На скільки днів?", "30"));
                  if (plan && days) act(`/api/admin/workspaces/${w.id}`, { action: "set_plan", plan, days }, `Тариф ${plan} на ${days} дн`);
                }}>Тариф</button>
                {w.suspendedAt ? (
                  <button className="btn small-btn" onClick={() => act(`/api/admin/workspaces/${w.id}`, { action: "unsuspend" }, "Відновлено")}>Відновити</button>
                ) : (
                  <button className="btn small-btn danger" onClick={() => { const reason = ask("Причина призупинення (бачитимуть адміни):"); if (reason) act(`/api/admin/workspaces/${w.id}`, { action: "suspend", reason }, "Призупинено"); }}>Призупинити</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
