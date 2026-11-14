"use client";
import { createContext, useContext } from "react";

export type AppInfo = { timezone: string; workspaceName: string; plan: string; email: string; aiConfigured: boolean; aiAllowed: boolean; aiCredits: number };
const Ctx = createContext<AppInfo | null>(null);

export function AppProvider({ value, children }: { value: AppInfo; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}
