/** The real domain in production, the deployment URL in previews, localhost while developing. */
export const SITE_URL =
  process.env.VERCEL_ENV === "production"
    ? "https://lexiapp.app"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
