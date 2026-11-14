import type { Metadata } from "next";
import "./globals.css";
import { BRAND, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND} — планувальник соцмереж`, template: `%s · ${BRAND}` },
  description: "Календар, планувальник і AI-рерайт для публікацій у соцмережах",
  openGraph: { type: "website", siteName: BRAND },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
