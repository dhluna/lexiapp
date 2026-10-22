import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The share preview reads its fonts from disk: ship them with the server output.
  outputFileTracingIncludes: { "/opengraph-image": ["./assets/fonts/**"] },
  partialPrefetching: true,
  // The service worker (daily reminder) must always be fresh and may only control Lexi's own pages.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
