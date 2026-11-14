"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["/admin", "Огляд"],
  ["/admin/users", "Користувачі"],
  ["/admin/content", "Модерація"],
  ["/admin/audit", "Журнал дій"],
] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="nav">
      {ITEMS.map(([href, label]) => (
        <Link key={href} href={href} className={(href === "/admin" ? path === href : path.startsWith(href)) ? "active" : ""}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
