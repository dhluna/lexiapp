import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Public pages are indexable; account flows and personal screens are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth/", "/entrar", "/restablecer-contrasena", "/ajustes", "/progreso"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
