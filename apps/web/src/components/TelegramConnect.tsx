"use client";
import { useEffect, useRef, useState } from "react";
import { api, type Channel } from "@/lib/client";
import { useI18n } from "@/i18n/client";

type Code = { code: string; expiresAt: string; username: string; links: { channel: string; group: string } };

/**
 * 3-step wizard: add our bot as admin → post `/connect CODE` in the channel → we detect the new channel.
 */
export function TelegramConnect({ channels, onConnected }: { channels: Channel[]; onConnected: () => void }) {
  const { t } = useI18n();
  const tt = t.telegram;
  const [code, setCode] = useState<Code | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const known = useRef<Set<string>>(new Set());

  async function start() {
    setError("");
    setDone(null);
    known.current = new Set(channels.filter((c) => c.platform === "telegram" && c.status !== "disconnected").map((c) => c.id + c.status));
    try {
      setCode(await api<Code>("/api/telegram/connect-code", { method: "POST" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // wait for the bot to see `/connect CODE` in the channel
  useEffect(() => {
    if (!code || done) return;
    const i = setInterval(async () => {
      const list = await api<Channel[]>("/api/channels");
      const fresh = list.find((c) => c.platform === "telegram" && c.status !== "disconnected" && !known.current.has(c.id + c.status));
      if (fresh) {
        setDone(fresh.name);
        setCode(null);
        onConnected();
      }
      if (new Date(code.expiresAt) < new Date()) setCode(null);
    }, 3000);
    return () => clearInterval(i);
  }, [code, done, onConnected]);

  const command = code ? `/connect ${code.code}` : "";

  return (
    <div className="card stack tg-connect">
      <h3>✈️ {tt.title}</h3>
      {done && <p className="notice">✅ {tt.connected.replace("{name}", done)}</p>}
      {!code ? (
        <>
          <p className="muted small">{tt.intro}</p>
          <button className="btn primary" onClick={start}>{tt.start}</button>
        </>
      ) : (
        <ol className="tg-steps">
          <li>
            <b>{tt.step1}</b>
            <div className="row wrap">
              <a className="btn" href={code.links.channel} target="_blank" rel="noreferrer">{tt.addChannel}</a>
              <a className="btn ghost" href={code.links.group} target="_blank" rel="noreferrer">{tt.addGroup}</a>
            </div>
            <span className="muted small">{tt.step1Hint.replace("{bot}", "@" + code.username)}</span>
          </li>
          <li>
            <b>{tt.step2}</b>
            <div className="code-box">
              <code className="mono">{command}</code>
              <button
                className="btn small-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(command);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "✓" : tt.copy}
              </button>
            </div>
            <span className="muted small">{tt.step2Hint}</span>
          </li>
          <li>
            <b>{tt.step3}</b>
            <span className="waiting"><span className="spinner" /> {tt.waiting}</span>
          </li>
        </ol>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
