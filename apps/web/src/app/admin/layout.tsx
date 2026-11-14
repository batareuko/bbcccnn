import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Адмінка", robots: { index: false, follow: false } };

/** Internal admin panel (Ukrainian only). Non-admins get a plain 404. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const a = await getAuth();
  if (!a || a.role !== "admin") notFound();
  return (
    <div className="shell admin">
      <header className="topbar">
        <Link href="/admin" className="brand"><span className="logo-dot" />Адмінка</Link>
        <AdminNav />
        <div className="spacer" />
        <span className="muted small">{a.email}</span>
        <Link href="/app" className="btn ghost">← У застосунок</Link>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
