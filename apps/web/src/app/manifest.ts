import type { MetadataRoute } from "next";

/** Lets Lexi be added to the home screen with its name, colors and icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lexi — vocabulario en inglés",
    short_name: "Lexi",
    description: "Practica vocabulario en inglés cada día, con pronunciación y ejemplos traducidos.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5fb",
    theme_color: "#3a3ed6",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
