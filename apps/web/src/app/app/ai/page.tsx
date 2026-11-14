"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Channel } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { useApp } from "@/components/AppContext";
import { dayKey } from "@/lib/tz";

export default function AiPlannerPage() {
  const { t } = useI18n();
  const { timezone: tz, aiAllowed, aiConfigured } = useApp();
  const router = useRouter();
  const tp = t.planner;
  const [channels, setChannels] = useState<Channel[]>([]);
  const [form, setForm] = useState({
    product: "",
    audience: "",
    goal: "",
    keywords: "",
    channelIds: [] as string[],
    startDate: dayKey(new Date(Date.now() + 864e5), tz),
    days: 14,
    postsPerWeek: 4,
    language: "Ukrainian",
    tone: "",
    status: "draft" as "draft" | "scheduled",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Channel[]>("/api/channels").then(setChannels);
  }, []);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/ai/content-plan", { method: "POST", json: form });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const total = Math.max(1, Math.round((form.days / 7) * form.postsPerWeek));

  return (
    <div className="narrow">
      <div className="page-head"><h1>✨ {tp.title}</h1></div>
      <p className="muted">{tp.subtitle}</p>
      {(!aiAllowed || !aiConfigured) && <p className="notice">{!aiAllowed ? tp.needPlan : tp.needKey}</p>}
      <form className="card stack" onSubmit={run}>
        <label>
          {tp.product}
          <textarea required minLength={10} rows={4} value={form.product} placeholder={tp.productPh} onChange={(e) => set("product", e.target.value)} />
        </label>
        <div className="grid2">
          <label>
            {tp.audience}
            <input value={form.audience} placeholder={tp.audiencePh} onChange={(e) => set("audience", e.target.value)} />
          </label>
          <label>
            {tp.goal}
            <input value={form.goal} placeholder={tp.goalPh} onChange={(e) => set("goal", e.target.value)} />
          </label>
        </div>
        <label>
          {tp.keywords}
          <input value={form.keywords} placeholder={tp.keywordsPh} onChange={(e) => set("keywords", e.target.value)} />
        </label>
        <div className="channel-picks">
          {channels.length === 0 && <span className="muted">{t.editor.noChannels}</span>}
          {channels.map((c) => (
            <label key={c.id} className={`pick ${form.channelIds.includes(c.id) ? "on" : ""}`} style={{ "--c": c.color } as React.CSSProperties}>
              <input
                type="checkbox"
                checked={form.channelIds.includes(c.id)}
                onChange={(e) => set("channelIds", e.target.checked ? [...form.channelIds, c.id] : form.channelIds.filter((x) => x !== c.id))}
              />
              <span className="dot" />{c.name}
            </label>
          ))}
        </div>
        <div className="grid3">
          <label>
            {tp.start}
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </label>
          <label>
            {tp.days}
            <input type="number" min={1} max={31} value={form.days} onChange={(e) => set("days", +e.target.value)} />
          </label>
          <label>
            {tp.perWeek}
            <input type="number" min={1} max={21} value={form.postsPerWeek} onChange={(e) => set("postsPerWeek", +e.target.value)} />
          </label>
        </div>
        <div className="grid2">
          <label>
            {t.editor.language}
            <select value={form.language} onChange={(e) => set("language", e.target.value)}>
              <option value="Ukrainian">Українська</option>
              <option value="English">English</option>
              <option value="Polish">Polski</option>
              <option value="German">Deutsch</option>
            </select>
          </label>
          <label>
            {t.editor.tone}
            <input value={form.tone} placeholder={t.editor.tonePh} onChange={(e) => set("tone", e.target.value)} />
          </label>
        </div>
        <div className="seg">
          <button type="button" className={form.status === "draft" ? "active" : ""} onClick={() => set("status", "draft")}>{tp.asDrafts}</button>
          <button type="button" className={form.status === "scheduled" ? "active" : ""} onClick={() => set("status", "scheduled")}>{tp.asScheduled}</button>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn accent big" disabled={busy || !form.channelIds.length || !aiAllowed || !aiConfigured}>
          {busy ? tp.busy : `${tp.run.replace("{n}", String(total))} · ${t.credits.planCost.replace("{n}", String(total))}`}
        </button>
      </form>
    </div>
  );
}
