import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { LEGAL_DOCS } from "@/legal/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const alt = { languages: { uk: `${SITE_URL}/`, en: `${SITE_URL}/en` } };
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1, alternates: alt },
    { url: `${SITE_URL}/en`, changeFrequency: "weekly", priority: 0.9, alternates: alt },
    ...LEGAL_DOCS.flatMap((d) => {
      const a = { languages: { uk: `${SITE_URL}/legal/${d}`, en: `${SITE_URL}/en/legal/${d}` } };
      return [
        { url: `${SITE_URL}/legal/${d}`, changeFrequency: "yearly" as const, priority: 0.3, alternates: a },
        { url: `${SITE_URL}/en/legal/${d}`, changeFrequency: "yearly" as const, priority: 0.3, alternates: a },
      ];
    }),
  ];
}
