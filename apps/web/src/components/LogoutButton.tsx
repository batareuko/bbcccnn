"use client";
import { api } from "@/lib/client";
import { useI18n } from "@/i18n/client";

export function LogoutButton() {
  const { t } = useI18n();
  return (
    <button
      className="btn ghost"
      onClick={async () => {
        await api("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      {t.nav.logout}
    </button>
  );
}
