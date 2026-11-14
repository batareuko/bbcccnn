import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getLocale } from "@/i18n/server";
import { normalizeLocale } from "@/i18n/dict";
import { I18nProvider } from "@/i18n/client";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ lang?: string; mode?: string }> }) {
  if (await getAuth()) redirect("/app");
  const sp = await searchParams;
  const locale = sp.lang ? normalizeLocale(sp.lang) : await getLocale();
  return (
    <I18nProvider locale={locale}>
      <LoginForm initialMode={sp.mode === "register" ? "register" : "login"} />
    </I18nProvider>
  );
}
