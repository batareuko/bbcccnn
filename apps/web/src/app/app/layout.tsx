import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/ai/providers";
import { effectivePlanId, planOf, trialDaysLeft } from "@/lib/plans";
import { getDict } from "@/i18n/server";
import { I18nProvider, LangSwitch } from "@/i18n/client";
import { AppProvider } from "@/components/AppContext";
import { LogoutButton } from "@/components/LogoutButton";
import { NavLinks } from "@/components/NavLinks";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  const ws = await db.workspace.findUniqueOrThrow({ where: { id: auth.workspaceId } });
  const { locale, t } = await getDict();
  const planId = effectivePlanId(ws);
  const daysLeft = trialDaysLeft(ws);

  return (
    <I18nProvider locale={locale}>
      <AppProvider
        value={{
          timezone: ws.timezone,
          workspaceName: ws.name,
          plan: planId,
          email: auth.email,
          aiConfigured: isAiConfigured(),
          aiAllowed: planOf(planId).active && ws.aiCredits > 0,
          aiCredits: ws.aiCredits,
        }}
      >
        <div className="shell">
          <header className="topbar">
            <Link href="/app" className="brand"><span className="logo-dot" />PostFlow</Link>
            <NavLinks />
            <div className="spacer" />
            <Link href="/app/billing#credits" className="credits" title={t.credits.title}>✨ <b>{ws.aiCredits}</b></Link>
            <LangSwitch />
            <Link href="/app/posts/new" className="btn primary">{t.nav.newPost}</Link>
            <LogoutButton />
          </header>
          {planId === "expired" ? (
            <div className="trial-bar expired">{ws.plan === "trial" ? t.trial.expired : t.trial.planEnded} <Link href="/app/billing" className="btn small-btn">{t.trial.choose}</Link></div>
          ) : daysLeft !== null ? (
            <div className="trial-bar">{t.trial.left.replace("{n}", String(daysLeft))} <Link href="/app/billing" className="btn small-btn">{t.trial.choose}</Link></div>
          ) : null}
          <main className="content">{children}</main>
        </div>
      </AppProvider>
    </I18nProvider>
  );
}
