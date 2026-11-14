"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";

export function NavLinks() {
  const { t } = useI18n();
  const path = usePathname();
  const items = [
    ["/app", t.nav.calendar],
    ["/app/posts", t.nav.posts],
    ["/app/channels", t.nav.channels],
    ["/app/sources", t.nav.sources],
    ["/app/ai", "✨ " + t.planner.nav],
    ["/app/settings", t.settings.title],
  ] as const;
  return (
    <nav className="nav">
      {items.map(([href, label]) => {
        const active = href === "/app" ? path === "/app" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? "active" : ""}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
