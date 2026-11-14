import type { Metadata } from "next";
import { Landing } from "@/components/Landing";
import { DICTS } from "@/i18n/dict";

export const metadata: Metadata = {
  title: DICTS.en.landing.metaTitle,
  description: DICTS.en.landing.metaDesc,
  alternates: { canonical: "/en", languages: { uk: "/", en: "/en" } },
  openGraph: { title: DICTS.en.landing.metaTitle, description: DICTS.en.landing.metaDesc, locale: "en_US" },
};

export default function HomeEn() {
  return <Landing locale="en" />;
}
