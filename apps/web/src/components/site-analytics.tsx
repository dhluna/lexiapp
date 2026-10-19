"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Only the path is counted: never the query string or the hash. The email links carry single-use
 * tokens there (`/auth/callback?token_hash=…`, `/restablecer-contrasena?token_hash=…`).
 */
export function withoutQuery(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  return { ...event, url: `${url.origin}${url.pathname}` };
}

/** Vercel Web Analytics: anonymous page views, no cookies. It only sends data in production. */
export function SiteAnalytics() {
  return <Analytics beforeSend={withoutQuery} />;
}
