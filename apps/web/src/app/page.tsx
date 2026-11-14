import type { Metadata } from "next";
import { Landing } from "@/components/Landing";
import { DICTS } from "@/i18n/dict";

export const metadata: Metadata = {
  title: DICTS.uk.landing.metaTitle,
  description: DICTS.uk.landing.metaDesc,
  alternates: { canonical: "/", languages: { uk: "/", en: "/en" } },
  openGraph: { title: DICTS.uk.landing.metaTitle, description: DICTS.uk.landing.metaDesc, locale: "uk_UA" },
};

export default function Home() {
  return <Landing locale="uk" />;
}
