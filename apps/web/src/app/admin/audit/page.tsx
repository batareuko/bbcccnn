"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { dt } from "../fmt";

type Row = { id: string; adminEmail: string; action: string; targetType: string; targetId: string; details: string | null; createdAt: string };

const TARGET_LINK: Record<string, (id: string) => string> = {
  user: (id) => `/admin/users?q=${id}`,
  workspace: (id) => `/admin/users?q=${id}`,
  post: (id) => `/admin/content?q=${id}`,
};

export default function AdminAudit() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    api<Row[]>("/api/admin/audit").then(setRows);
  }, []);
  return (
    <div className="stack">
      <div className="page-head"><h1>Журнал дій</h1><span className="muted small">останні 200 дій адміністраторів</span></div>
      {!rows ? <p className="muted">Завантаження…</p> : rows.length === 0 ? <div className="card empty">Дій ще не було</div> : (
        <div className="card table-wrap">
          <table className="table">
            <tbody>
              {rows.map((r) => {
                const details = r.details ? (JSON.parse(r.details) as Record<string, unknown>) : {};
                return (
                  <tr key={r.id}>
                    <td className="mono small">{dt(r.createdAt)}</td>
                    <td className="small">{r.adminEmail}</td>
                    <td><span className="tag mono">{r.action}</span></td>
                    <td className="small"><Link href={TARGET_LINK[r.targetType]?.(r.targetId) ?? "#"}>{r.targetType} {r.targetId.slice(-8)}</Link></td>
                    <td className="small muted" style={{ whiteSpace: "normal" }}>
                      {Object.entries(details).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
