import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const alt = { languages: { uk: `${SITE_URL}/`, en: `${SITE_URL}/en` } };
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1, alternates: alt },
    { url: `${SITE_URL}/en`, changeFrequency: "weekly", priority: 0.9, alternates: alt },
  ];
}
