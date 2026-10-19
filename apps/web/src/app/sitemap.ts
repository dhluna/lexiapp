import type { MetadataRoute } from "next";
import { WORDS } from "@lexi/core/data/catalog";
import { SITE_URL } from "@/lib/site";

/**
 * The home, the vocabulary and one page per word (useful for searches like
 * "qué significa give up"). No lastModified: the catalog changes only with each release.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/vocabulario`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/practicar`, changeFrequency: "monthly", priority: 0.6 },
    ...WORDS.map((word) => ({
      url: `${SITE_URL}/vocabulario/${word.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    { url: `${SITE_URL}/compartir`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
